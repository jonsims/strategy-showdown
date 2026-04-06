# Strategy Showdown

## What This Is
A classroom web app for Babson College's SES2000-05 (Socio-Ecological Systems) course. Used during Session 20 to facilitate a case discussion about Microsoft's data center sustainability strategies (WDI case W40C20). Students evaluate three strategies, draft moonshot goals, and vote on proposals.

## Tech Stack
- **Server:** Node.js + Express (vanilla, no framework)
- **Frontend:** Static HTML/CSS/JS (no build step, no bundler)
- **State:** In-memory with file-based persistence (`state.json`)
- **Deployment:** Local via Caddy (`https://local.strategy-showdown`, port 3020); Render for production

## Project Structure
```
strategy-showdown/
  server.js          — Express server, all API routes, state management (333 lines)
  package.json       — express dependency only
  render.yaml        — Render deployment blueprint
  state.json         — Auto-generated state persistence (gitignored)
  public/
    index.html       — Student view, laptop-optimized two-panel layout (1790 lines)
    admin.html       — Instructor admin panel with PIN gate (469 lines)
    display.html     — Projector display for shared classroom view (690 lines)
```

## Three Phases
1. **Place Your Bet** — Students pick a strategy and cite three case numbers
2. **Moonshot Moment** — Teams submit a one-sentence goal with leverage level classification and cost bearer
3. **Fund It or Kill It** — Students distribute 100 budget points across proposals (25-point self-cap)

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | Aggregated state for polling |
| POST | `/api/join` | Student joins with name + team |
| POST | `/api/phase1` | Submit strategy bet + 3 numbers |
| POST | `/api/budget` | Team budget allocation (modular/renewable/optimize) |
| POST | `/api/moonshot` | Team moonshot with leverage level + cost bearer |
| POST | `/api/fund` | Individual funding allocation (100 pts, 25 self-cap) |
| POST | `/admin/advance-phase` | Advance phase (2-sec cooldown) |
| POST | `/admin/set-phase` | Set specific phase |
| POST | `/admin/set-teams` | Configure team count |
| POST | `/admin/reset` | Reset all state |
| GET | `/admin/state` | Full state (PIN required) |

## Key Design Decisions
- **Admin PIN:** 2030 (the year of Microsoft's sustainability pledge)
- **Polling:** 2-second interval, no websockets (works on flaky classroom Wi-Fi)
- **State persistence:** Synchronous writes to `state.json` after every mutation (crash recovery)
- **Self-funding cap:** 25 points max to own team (prevents loyalty voting)
- **Phase 1 reveal delay:** Strategy results hidden until 75% of students have submitted (prevents bandwagon)
- **Leverage levels:** Fischer & Riechers framework — Parameters, Feedbacks, Design, Intent
- **Laptop-first:** Designed for browser on laptops, not mobile phones

## Development
```bash
npm install
npm start          # Runs on port 3020
# Access via https://local.strategy-showdown (Caddy must be running)
```

## Current Known Issues
- None identified — working tree clean, all features tested
