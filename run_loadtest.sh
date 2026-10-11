#!/usr/bin/env bash
# ============================================================
#  RakshaSaathi — Linux Load Test Runner (NO Docker)
#  Installs Redis, NATS, Postgres natively via apt/binary.
#  Builds Go backend, runs unit tests, then full ramp test.
#
#  Tested on: Ubuntu 22.04 / 24.04 (also works on Debian 12)
#  Run as:    bash run_loadtest.sh [--port 8080] [--type fall] [--ramp "1,5,10,50,100,500,1000"]
# ============================================================
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
APP_PORT="${APP_PORT:-8080}"
EVENT_TYPE="${EVENT_TYPE:-fall}"
MAX_CONC="${MAX_CONC:-100}"
TIMEOUT_MS="${TIMEOUT_MS:-3000}"
RAMP="${RAMP:-1,5,10,25,50,100,250,500,1000,2500,5000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
NATS_VERSION="v2.10.24"
NATS_BIN="$HOME/.local/bin/nats-server"

# Parse CLI flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)     APP_PORT="$2";   shift 2 ;;
    --type)     EVENT_TYPE="$2"; shift 2 ;;
    --conc)     MAX_CONC="$2";   shift 2 ;;
    --timeout)  TIMEOUT_MS="$2"; shift 2 ;;
    --ramp)     RAMP="$2";       shift 2 ;;
    *) echo "Unknown flag $1"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   RakshaSaathi — No-Docker Linux Load Test Runner   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Port:       $APP_PORT"
echo "║  Event type: $EVENT_TYPE"
echo "║  Ramp:       $RAMP"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Install dependencies ───────────────────────────────────────────────────
echo "==> [1/7] Installing system dependencies..."

if command -v apt-get &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends \
    redis-server postgresql postgresql-contrib \
    curl wget build-essential git ca-certificates 2>/dev/null
else
  echo "[WARN] apt-get not found. Assuming Redis and Postgres are installed."
fi

# ── Install Go if not present ─────────────────────────────────────────────────
if ! command -v go &>/dev/null; then
  echo "==> Go not found. Installing Go 1.22..."
  GO_TAR="go1.22.5.linux-amd64.tar.gz"
  wget -q "https://go.dev/dl/$GO_TAR" -O /tmp/$GO_TAR
  sudo tar -C /usr/local -xzf /tmp/$GO_TAR
  export PATH=$PATH:/usr/local/go/bin
  echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
fi
echo "  Go: $(go version)"

# ── Install NATS server binary (no Docker, no apt) ───────────────────────────
if ! command -v nats-server &>/dev/null && [[ ! -f "$NATS_BIN" ]]; then
  echo "==> Downloading NATS server $NATS_VERSION..."
  ARCH=$(uname -m)
  NATS_ARCH="amd64"
  [[ "$ARCH" == "aarch64" ]] && NATS_ARCH="arm64"
  NATS_URL="https://github.com/nats-io/nats-server/releases/download/${NATS_VERSION}/nats-server-${NATS_VERSION}-linux-${NATS_ARCH}.tar.gz"
  mkdir -p "$HOME/.local/bin"
  wget -q "$NATS_URL" -O /tmp/nats-server.tar.gz
  tar -xzf /tmp/nats-server.tar.gz -C /tmp
  cp /tmp/nats-server-${NATS_VERSION}-linux-${NATS_ARCH}/nats-server "$NATS_BIN"
  chmod +x "$NATS_BIN"
  export PATH=$PATH:$HOME/.local/bin
fi
NATS_CMD=$(command -v nats-server 2>/dev/null || echo "$NATS_BIN")
echo "  NATS: $($NATS_CMD --version)"

# ── 2. Start Redis ────────────────────────────────────────────────────────────
echo ""
echo "==> [2/7] Starting Redis..."
if redis-cli ping &>/dev/null 2>&1; then
  echo "  Redis already running."
else
  redis-server --daemonize yes \
    --logfile "$LOG_DIR/redis.log" \
    --bind 127.0.0.1 \
    --port 6379 \
    --save "" \
    --appendonly no
  sleep 1
  redis-cli ping | grep -q PONG && echo "  Redis started." || { echo "ERROR: Redis failed to start"; exit 1; }
fi

# ── 3. Start NATS JetStream ───────────────────────────────────────────────────
echo ""
echo "==> [3/7] Starting NATS JetStream..."
pkill -f "nats-server" 2>/dev/null || true
sleep 0.5
"$NATS_CMD" \
  --jetstream \
  --port 4222 \
  --http_port 8222 \
  --store_dir /tmp/nats-store \
  --log "$LOG_DIR/nats.log" \
  --pid /tmp/nats.pid \
  -D &
NATS_PID=$!
sleep 2
curl -sf http://localhost:8222/healthz >/dev/null && echo "  NATS JetStream running (PID $NATS_PID)" || {
  echo "ERROR: NATS failed to start. Check $LOG_DIR/nats.log"
  exit 1
}

# ── 4. Start PostgreSQL ───────────────────────────────────────────────────────
echo ""
echo "==> [4/7] Starting PostgreSQL..."
if pg_isready -q 2>/dev/null; then
  echo "  PostgreSQL already running."
else
  sudo service postgresql start 2>/dev/null || sudo systemctl start postgresql 2>/dev/null || true
  sleep 2
fi

# Create DB and user if they don't exist
sudo -u postgres psql -c "CREATE USER postgres_raksha WITH PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE gharseva OWNER postgres;" 2>/dev/null || \
  sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1 && echo "  PostgreSQL ready."

# ── 5. Build Go backend ───────────────────────────────────────────────────────
echo ""
echo "==> [5/7] Building Go backend..."
BACKEND_DIR="$SCRIPT_DIR/backend"
cd "$BACKEND_DIR"
go mod download 2>&1 | tail -3
GOOS=linux GOARCH=amd64 go build -o raksha_linux ./cmd/main.go
echo "  Built: $BACKEND_DIR/raksha_linux"

# ── 6. Run unit tests ─────────────────────────────────────────────────────────
echo ""
echo "==> [6/7] Running unit tests..."
go test ./internal/services/... ./internal/repositories/... \
  -v -timeout 60s 2>&1 | tee "$LOG_DIR/unit_tests.log"
UNIT_EXIT=${PIPESTATUS[0]}
if [[ $UNIT_EXIT -ne 0 ]]; then
  echo ""
  echo "[WARN] Unit tests had failures. See $LOG_DIR/unit_tests.log"
else
  echo "  All unit tests PASSED."
fi

# ── 7. Start backend and run ramp test ────────────────────────────────────────
echo ""
echo "==> [7/7] Starting backend and running ramp load test..."

# Kill any old backend
pkill -f "raksha_linux" 2>/dev/null || true
sleep 0.3

# Start backend
env \
  PORT="$APP_PORT" \
  DB_HOST=localhost DB_PORT=5432 \
  DB_USER=postgres DB_PASSWORD=postgres DB_NAME=gharseva \
  REDIS_HOST=localhost REDIS_PORT=6379 REDIS_PASSWORD="" \
  NATS_URL=nats://localhost:4222 \
  ./raksha_linux > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be healthy
echo "  Waiting for backend health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:$APP_PORT/health >/dev/null; then
    echo "  Backend healthy after ${i}s"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo "ERROR: Backend didn't start in 30s. Logs:"
    tail -30 "$LOG_DIR/backend.log"
    exit 1
  fi
done

# Build and run ramp benchmark
cd "$SCRIPT_DIR/Benchmark"
echo ""
echo "  Building ramp benchmark..."
go run bench_ramp.go \
  -url "http://localhost:$APP_PORT" \
  -redis "localhost:6379" \
  -nats-mon "http://localhost:8222" \
  -concurrency "$MAX_CONC" \
  -timeout-ms "$TIMEOUT_MS" \
  -type "$EVENT_TYPE" \
  -ramp "$RAMP" \
  2>&1 | tee "$LOG_DIR/ramp_results.log"

RAMP_EXIT=${PIPESTATUS[0]}

# ── Cleanup ───────────────────────────────────────────────────────────────────
echo ""
echo "==> Cleanup..."
kill $BACKEND_PID 2>/dev/null || true
kill $NATS_PID 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                  TEST RUN COMPLETE                   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Unit tests:    $([ $UNIT_EXIT -eq 0 ] && echo 'PASSED' || echo 'SOME FAILURES')"
echo "║  Ramp results:  $LOG_DIR/ramp_results.log"
echo "║  Ramp JSON:     $SCRIPT_DIR/Benchmark/ramp_results.json"
echo "║  Backend log:   $LOG_DIR/backend.log"
echo "╚══════════════════════════════════════════════════════╝"

exit $RAMP_EXIT
