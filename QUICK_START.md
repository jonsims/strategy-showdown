# Strategy Showdown — Quick Start Guide

## What This App Does

Strategy Showdown is a three-phase classroom exercise for the Microsoft and AI sustainability case (W40C20). Students pick a strategy, draft a moonshot goal, and vote on which team's proposal they'd fund. It runs in the browser on student laptops and projects results on the classroom screen.

---

## Before Class

### 1. Start the server

Open Terminal, navigate to the app folder, and start:

```bash
cd "/Users/jonsims/Desktop/Working drafts/SES Working/SESSIONS (working)/Session 20 - Microsoft Case/strategy-showdown"
npm start
```

You should see:
```
Strategy Showdown is running!
Local:   http://localhost:3020
```

### 2. Create a public URL for students

In a second Terminal tab:

```bash
cloudflared tunnel --url http://localhost:3020
```

It will print a URL like:
```
https://some-random-words.trycloudflare.com
```

Copy this URL. This is what students will use.

### 3. Open your screens

- **Your laptop:** Go to `https://local.strategy-showdown/admin.html` and enter PIN **2030**
- **Projector:** Open `https://local.strategy-showdown/display.html` in a browser window on the projector

### 4. Configure teams

In the admin panel, set the number of teams using the dropdown and click "Update."

### 5. Reset if needed

If there's leftover data from testing, click "Reset All" in the admin panel.

---

## During Class

### Phase 1 — Place Your Bet (~10 min)

**What students do:** Open the URL on their laptops, enter their name and team number, pick one of three strategies, and cite three numbers from the case to justify their choice.

**What you do:** Watch the admin panel for submission count. The projector display hides results until 75% of students have submitted (prevents bandwagon effect). Once results appear, use the split-team indicators to cold-call: "Team 4, you were split — what was the argument?"

**When to advance:** When all or nearly all students have submitted. Click **"Advance to Next Phase"** in the admin panel.

### Phase 2 — Moonshot Moment (~15 min)

**What students do:** Each team drafts a one-sentence moonshot goal. They must specify a target year, measurable metric, funding mechanism, leverage level (Fischer & Riechers), and who bears the ecological/community cost. One submission per team.

**What you do:** Circulate and push teams: "Is your goal actually measurable?" "Does it address the communities?" Watch the admin panel to see moonshots arrive. The projector shows each team's card as they submit.

**When to advance:** When all teams have submitted (or you're ready to move on). Do the 45-second team pitches BEFORE advancing to Phase 3.

### Phase 3 — Fund It or Kill It (~10 min)

**What students do:** Each student distributes 100 budget points across all team proposals. They can see the full moonshot cards (goal, leverage level, who bears the cost) on their screen. Maximum 25 points to their own team.

**What you do:** Watch the live funding bars on the projector. When most votes are in, click **"Advance to Next Phase"** to lock results and show final rankings.

### Done — Debrief

The projector shows final rankings with gold/silver/bronze badges and a discussion prompt. This is where you deliver the epilogue (what Microsoft actually did) and ask: "How do your proposals compare?"

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Students can't reach the URL | Make sure `cloudflared` is still running in Terminal. If it crashed, restart it — you'll get a new URL. |
| Student sees wrong name | They're on a shared device. Click "Not you?" at the top of their screen to switch. |
| Accidentally advanced a phase | Use the admin panel's phase controls. You can't go backward, but the app has a 2-second cooldown to prevent double-clicks. |
| Server crashed | Just run `npm start` again. State is saved to `state.json` automatically — everything will be restored. |
| Student joined late | They'll see a message saying they missed earlier phases and can participate in the current one. |
| App is slow | 30 students polling every 2 seconds is fine. If it feels sluggish, check that no other heavy apps are running on your laptop. |

---

## Key Details

- **Admin PIN:** 2030
- **Port:** 3020
- **State is saved automatically** to `state.json` after every action
- **Backup URL:** https://strategy-showdown.onrender.com (free tier — may cold-start after 15 min idle)
- **Local URL:** https://local.strategy-showdown (requires Caddy running)
