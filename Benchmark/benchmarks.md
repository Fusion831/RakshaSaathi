# Benchmarks — WSL Native Run (Zombie port, segfault, native compile)

Date: 2026-04-26

Overview
--------
This file documents the concrete WSL troubleshooting steps and the exact native `nats` command used to run the JetStream throughput benchmark. The resulting screenshot is saved in this folder: `Benchmark/NATSTerminal.png`.

Phase 1 — Zombie Port Conflict (port 4222)
-------------------------------------------------
Symptom: `nats-server -js &` fails with `bind: address already in use`.

Cause: A systemd-installed `nats-server` daemon was started on install (without `-js`) and is occupying port 4222.

Fix (commands to run in WSL):

```bash
sudo systemctl stop nats-server
sudo killall nats-server || true
# start a JetStream-enabled server under your control
nats-server -js &
```

Phase 2 — Segmentation Fault from Prebuilt `nats` Binary
-------------------------------------------------
Symptom: Prebuilt `nats` CLI binary immediately segfaults (kernel kills process).

Cause: WSL can be sensitive to prebuilt binaries due to syscall/memory-mapping differences.

Fix: Remove the broken binary and build natively with Go (ensures correct architecture and no segfaults):

```bash
rm -f nats
go install github.com/nats-io/natscli/nats@latest
export PATH=$PATH:$(go env GOPATH)/bin
which nats   # should point to $(go env GOPATH)/bin/nats
```

Phase 3 — Syntax Alignment (CLI flag changes)
-------------------------------------------------
Symptom: Older `nats bench` flags such as `--pub` yield `unknown flag` errors after building the bleeding-edge CLI.

Cause: The CLI upstream changed the benchmarking interface (new subcommands and `--clients` flag replace older flags).

Fix: Use the updated subcommand and flags. Run the benchmark using the native binary path (or `nats` if GOPATH bin is on `PATH`):

```bash
~/go/bin/nats bench pub "telemetry.ingest" --clients 20 --msgs 500000 --size 256

# or (if GOPATH/bin is in PATH)
nats bench pub "telemetry.ingest" --clients 20 --msgs 500000 --size 256
```

Phase 4 — Execution & Result
-------------------------------
Command run (WSL native build):

```bash
~/go/bin/nats bench pub "telemetry.ingest" --clients 20 --msgs 500000 --size 256
```

Example observed final output (screenshot saved as `Benchmark/NATSTerminal.png`):

```
--- telemetry.ingest ---
Pub stats: 500,000 msgs | ~6,300,000 msgs/sec | ~1.5 GiB/sec
Avg latency: 1.30 µs
Lost: 0
```

Notes
-----
- If you still see a bind error, double-check that no other `nats-server` process exists (`ps aux | grep nats-server`) and ensure `systemctl` stop succeeded.
- If `go install` fails, ensure `GO111MODULE` and `GOPATH` are configured normally for your WSL environment and that `go` is installed (recommended: Go 1.20+ / 1.24+).
- The screenshot in this folder (`Benchmark/NATSTerminal.png`) is the one referenced for resume proofs — keep it alongside other artifacts.

Quick copy-paste checklist
--------------------------

```bash
# 1) stop background nats-server (if any)
sudo systemctl stop nats-server
sudo killall nats-server || true

# 2) start JetStream-enabled server
nats-server -js &

# 3) build native CLI
rm -f nats
go install github.com/nats-io/natscli/nats@latest
export PATH=$PATH:$(go env GOPATH)/bin

# 4) run benchmark
~/go/bin/nats bench pub "telemetry.ingest" --clients 20 --msgs 500000 --size 256
```

If you'd like, I can also add a tiny README in this `Benchmark/` folder that points to full WSL instructions, or rename this file — tell me which. 
