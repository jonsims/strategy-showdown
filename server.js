const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3020;
const ADMIN_PIN = '2030';
const STATE_FILE = path.join(__dirname, 'state.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: false }));

// ── State ───────────────────────────────────────────────────────────────────

let state = freshState();

function freshState() {
  return {
    numTeams: 8,
    moonshots: {},  // teamId → { teamId, year, goal, metric, targetNumber, funding, leverageLevel, costBearer }
  };
}

function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return true;
    }
  } catch(e) {}
  return false;
}

loadState();

// ── Public API ──────────────────────────────────────────────────────────────

app.get('/api/state', (_req, res) => {
  res.json({
    numTeams: state.numTeams,
    moonshots: state.moonshots,
  });
});

app.post('/api/moonshot', (req, res) => {
  const { teamId, year, goal, metric, targetNumber, funding, leverageLevel, costBearer, teammates } = req.body;
  if (!teamId || !year || !goal || !metric || !targetNumber || !funding || !leverageLevel || !costBearer) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const validLeverage = ['Parameters', 'Feedbacks', 'Design', 'Intent'];
  if (!validLeverage.includes(leverageLevel)) {
    return res.status(400).json({ error: 'leverageLevel must be one of: Parameters, Feedbacks, Design, Intent' });
  }
  if (typeof costBearer !== 'string' || !costBearer.trim()) {
    return res.status(400).json({ error: 'costBearer must be a non-empty string' });
  }
  const tid = parseInt(teamId);
  if (isNaN(tid) || tid < 1 || tid > state.numTeams) {
    return res.status(400).json({ error: 'Invalid team' });
  }
  if (state.moonshots[tid]) {
    return res.status(400).json({ error: 'Your team has already submitted a moonshot' });
  }
  if (goal.length > 280) {
    return res.status(400).json({ error: 'Goal must be 280 characters or less' });
  }
  state.moonshots[tid] = {
    teamId: tid,
    year,
    goal: goal.trim(),
    metric: metric.trim(),
    targetNumber: targetNumber.trim(),
    funding: funding.trim(),
    leverageLevel,
    costBearer: costBearer.trim(),
    teammates: (teammates || '').trim()
  };
  saveState();
  res.json({ ok: true });
});

// ── Admin API ───────────────────────────────────────────────────────────────

function checkPin(pin) { return String(pin) === ADMIN_PIN; }

app.post('/admin/set-teams', (req, res) => {
  if (!checkPin(req.body.pin)) return res.status(403).json({ error: 'Invalid PIN' });
  const n = parseInt(req.body.numTeams);
  if (isNaN(n) || n < 1 || n > 20) return res.status(400).json({ error: 'Teams must be 1-20' });
  state.numTeams = n;
  saveState();
  res.json({ numTeams: n });
});

app.post('/admin/reset', (req, res) => {
  if (!checkPin(req.body.pin)) return res.status(403).json({ error: 'Invalid PIN' });
  const teams = state.numTeams;
  state = freshState();
  state.numTeams = teams;
  saveState();
  res.json({ ok: true });
});

app.post('/admin/load-dummy', (req, res) => {
  if (!checkPin(req.body.pin)) return res.status(403).json({ error: 'Invalid PIN' });

  const teams = state.numTeams;
  state = freshState();
  state.numTeams = teams;

  const leverageLevels = ['Parameters', 'Feedbacks', 'Design', 'Intent'];
  const goals = [
    'Achieve net-zero across all data center operations',
    'Power 100% of operations with on-site renewables',
    'Eliminate water usage in cooling systems entirely',
    'Make all hardware fully circular and recyclable',
    'Remove more carbon than emitted across supply chain',
    'Deploy modular nuclear reactors at every campus',
    'Reach carbon-negative status by end of decade',
    'Zero-waste manufacturing for all server components'
  ];
  const costBearers = ['Microsoft shareholders', 'Cloud customers via pricing', 'Joint venture partners', 'Government subsidies', 'Industry consortium', 'Internal R&D budget', 'Carbon credit revenue', 'Green bond investors'];
  const metrics = ['MT CO2 removed', '% renewable energy', 'gallons water saved', 'tons e-waste diverted', 'MWh clean energy generated', 'carbon intensity per workload', 'PUE ratio improvement', 'supply chain emissions reduction'];

  for (let t = 1; t <= state.numTeams; t++) {
    state.moonshots[t] = {
      teamId: t,
      year: String(2028 + Math.floor(Math.random() * 7)),
      goal: goals[(t - 1) % goals.length],
      metric: metrics[(t - 1) % metrics.length],
      targetNumber: String(Math.floor(Math.random() * 90) + 10) + '%',
      funding: '$' + String(Math.floor(Math.random() * 9) + 1) + 'B',
      leverageLevel: leverageLevels[(t - 1) % 4],
      costBearer: costBearers[(t - 1) % costBearers.length]
    };
  }

  saveState();
  res.json({ ok: true, teams: state.numTeams });
});

app.get('/admin/state', (req, res) => {
  if (!checkPin(req.query.pin)) return res.status(403).json({ error: 'Invalid PIN' });
  res.json(state);
});

// ── Server start ────────────────────────────────────────────────────────────

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

app.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`\n  Moonshot Moment is running!\n`);
  console.log(`  Students: http://localhost:${PORT}/moonshot.html`);
  console.log(`  Display:  http://localhost:${PORT}/display.html`);
  console.log(`  Admin:    http://localhost:${PORT}/admin.html`);
  console.log(`  Network:  http://${ip}:${PORT}\n`);
});
