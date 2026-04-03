# 🎬 RakshaSaathi Demo - Quick Reference

## One-Minute Setup

### Terminal 1: Backend
```bash
cd backend && docker-compose up -d && go run cmd/main.go
```

### Terminal 2: Frontend
```bash
cd frontend && npm run dev
```

### Terminal 3: Open Browser
```
http://localhost:5173
```

### Terminal 4: Start Demo (5 minutes)
```bash
cd C:\Users\daksh\Projects\SIHHackathon
powershell -File DEMO_MODE.ps1
```

---

## What to Watch

| Feature | What Happens | Location |
|---------|-------------|----------|
| **Vitals** | Update every 1 second | SummaryCards + VitalsSnapshot |
| **Anomalies** | Random warnings (30% chance) | Yellow toast (8 sec auto-dismiss) |
| **Falls** | Random escalations (5% chance) | Red modal, escalates 3x at 30s intervals |
| **History** | All events recorded | "View History" button in header |
| **Acknowledge** | Stop escalation manually | Click "Acknowledge" in modal |

---

## Demo Scenarios

### Scenario 1: Quick Showcase (3 minutes)
```bash
powershell -File DEMO_MODE.ps1 -Duration 180
```
✅ Shows: Vitals, Anomalies, Falls, History panel, Acknowledgement

### Scenario 2: Escalation Deep Dive (5 minutes)
```bash
powershell -File DEMO_MODE.ps1 -Duration 300
```
✅ Wait for fall → Watch LEVEL_1 → LEVEL_2 → LEVEL_3 → Click Acknowledge

### Scenario 3: High-Speed Test (2 minutes)
```bash
powershell -File DEMO_MODE.ps1 -Duration 120 -Interval 200
```
✅ Stress test: Updates every 200ms, extreme data flow

---

## Key Buttons

### Frontend Dashboard
| Button | Action |
|--------|--------|
| **Start Live Demo** | Begins PowerShell demo script (show status) |
| **View History** | Opens side panel with alert history |
| **Acknowledge** | Stops alert escalation + marks resolved |

---

## Data Being Streamed

**Every 1 second:**
- Heart Rate: 60-90 BPM
- SpO2: 94-99%
- Temperature: 36-38°C
- Activity Level + Acceleration

**Randomly:**
- Anomaly every ~30 seconds (warning toast)
- Fall every ~150 seconds (escalating modal)

---

## Real-Time Updates

```
PowerShell Script → Backend /event → NATS → Consumers → 
Alert Engine → Databases → WebSocket → Frontend ⚡
```

**Latency: < 100ms end-to-end**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend not responding | `curl http://localhost:8080/health` |
| Frontend not updating | Check browser DevTools → Network → WS |
| History showing empty | Wait for events, then click Refresh |
| Demo script not working | Verify port 8080 free, backend running |

---

## Files Reference

| File | Purpose |
|------|---------|
| `DEMO_MODE.ps1` | PowerShell script for continuous data |
| `DEMO_GUIDE.md` | Detailed comprehensive guide |
| `QUICK_TEST.ps1` | Manual event sending (for one-offs) |
| `FamilyDashboard.tsx` | Frontend with demo buttons |
| `AlertHistory.tsx` | History side panel component |
| `DemoButton.tsx` | Start/Stop demo button |

---

🎉 **Ready?** Run the 4 commands above and watch the system come alive!
