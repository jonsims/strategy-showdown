const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3020;
const ADMIN_PIN = '2030';
const STATE_FILE = path.join(__dirname, 'state.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory state ─────────────────────────────────────────────────────────

let state = freshState();

function freshState() {
  return {
    phase: 1,            // 1, 2, 3, or 4 (done)
    numTeams: 8,         // configurable by admin
    students: [],        // { id, name, team }
    phase1: [],          // { studentId, name, team, strategy, energyNumber, costNumber, impactNumber }
    moonshots: {},       // teamId → { teamId, year, goal, metric, targetNumber, funding, leverageLevel, costBearer }
    funding: [],         // { studentId, allocations: { teamId: points } }
    budgets: {},         // teamId → { teamId, modular, renewable, optimize }
  };
}

// Unique ID generator
let nextId = 1;
function genId() { return String(nextId++); }

// ── State persistence (crash recovery) ──────────────────────────────────────

function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify({ state, nextId })); } catch(e) {}
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = saved.state;
      nextId = saved.nextId;
      return true;
    }
  } catch(e) {}
  return false;
}

// Load persisted state if available
loadState();

// ── Phase advance cooldown ──────────────────────────────────────────────────

let lastAdvanceTime = 0;

// ── Public API ──────────────────────────────────────────────────────────────

// Aggregated state for display & student views
app.get('/api/state', (_req, res) => {
  // Aggregate phase1 strategy counts by team
  const strategyCounts = {};
  const strategies = ['Redesign the Machine', 'Change the Fuel', 'Tune the Engine'];
  for (let t = 1; t <= state.numTeams; t++) {
    strategyCounts[t] = {};
    strategies.forEach(s => { strategyCounts[t][s] = 0; });
  }
  state.phase1.forEach(s => {
    if (strategyCounts[s.team]) {
      strategyCounts[s.team][s.strategy] = (strategyCounts[s.team][s.strategy] || 0) + 1;
    }
  });

  // Numbers feed (most recent first)
  const numbersFeed = state.phase1.map(s => ({
    name: s.name,
    team: s.team,
    strategy: s.strategy,
    energyNumber: s.energyNumber,
    costNumber: s.costNumber,
    impactNumber: s.impactNumber
  })).reverse();

  // Aggregate funding
  const fundingTotals = {};
  for (let t = 1; t <= state.numTeams; t++) fundingTotals[t] = 0;
  state.funding.forEach(f => {
    Object.entries(f.allocations).forEach(([tid, pts]) => {
      fundingTotals[tid] = (fundingTotals[tid] || 0) + pts;
    });
  });

  res.json({
    phase: state.phase,
    numTeams: state.numTeams,
    studentCount: state.students.length,
    phase1Count: state.phase1.length,
    strategyCounts,
    numbersFeed,
    moonshots: state.moonshots,
    budgets: state.budgets,
    fundingTotals,
    fundingVoterCount: state.funding.length
  });
});

// Join
app.post('/api/join', (req, res) => {
  const { name, team } = req.body;
  if (!name || !team) return res.status(400).json({ error: 'Name and team required' });
  const teamNum = parseInt(team);
  if (isNaN(teamNum) || teamNum < 1 || teamNum > state.numTeams) {
    return res.status(400).json({ error: 'Invalid team number' });
  }
  // Check if name already used
  const existing = state.students.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return res.json({ studentId: existing.id, name: existing.name, team: existing.team });
  }
  const id = genId();
  const student = { id, name: name.trim(), team: teamNum };
  state.students.push(student);
  saveState();
  res.json({ studentId: id, name: student.name, team: student.team });
});

// Phase 1 — Place Your Bet
app.post('/api/phase1', (req, res) => {
  if (state.phase !== 1) return res.status(400).json({ error: 'Not in Phase 1' });
  const { studentId, strategy, energyNumber, costNumber, impactNumber } = req.body;
  if (!studentId || !strategy || !energyNumber || !costNumber || !impactNumber) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const validStrategies = ['Redesign the Machine', 'Change the Fuel', 'Tune the Engine'];
  if (!validStrategies.includes(strategy)) {
    return res.status(400).json({ error: 'Invalid strategy' });
  }
  const student = state.students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  // Check if already submitted
  const alreadySubmitted = state.phase1.find(s => s.studentId === studentId);
  if (alreadySubmitted) return res.status(400).json({ error: 'Already submitted for Phase 1' });

  state.phase1.push({
    studentId,
    name: student.name,
    team: student.team,
    strategy,
    energyNumber: energyNumber.trim(),
    costNumber: costNumber.trim(),
    impactNumber: impactNumber.trim()
  });
  saveState();
  res.json({ ok: true });
});

// Phase 2 — Moonshot
app.post('/api/moonshot', (req, res) => {
  if (state.phase !== 2) return res.status(400).json({ error: 'Not in Phase 2' });
  const { teamId, year, goal, metric, targetNumber, funding, leverageLevel, costBearer } = req.body;
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
    costBearer: costBearer.trim()
  };
  saveState();
  res.json({ ok: true });
});

// Phase 3 — Fund It or Kill It
app.post('/api/fund', (req, res) => {
  if (state.phase !== 3) return res.status(400).json({ error: 'Not in Phase 3' });
  const { studentId, allocations } = req.body;
  if (!studentId || !allocations) {
    return res.status(400).json({ error: 'studentId and allocations required' });
  }
  const student = state.students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  // Check already voted
  if (state.funding.find(f => f.studentId === studentId)) {
    return res.status(400).json({ error: 'Already voted' });
  }
  // Validate sum = 100
  let total = 0;
  for (const [tid, pts] of Object.entries(allocations)) {
    const p = parseInt(pts);
    if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Points must be non-negative integers' });
    total += p;
  }
  if (total !== 100) return res.status(400).json({ error: `Points must sum to 100 (got ${total})` });

  // Self-funding cap: cannot allocate more than 25 points to own team
  const studentTeam = String(student.team);
  const selfAlloc = parseInt(allocations[studentTeam]) || 0;
  if (selfAlloc > 25) {
    return res.status(400).json({ error: 'Cannot allocate more than 25 points to your own team' });
  }

  state.funding.push({ studentId, allocations });
  saveState();
  res.json({ ok: true });
});

// Phase 1 — Budget Allocation
app.post('/api/budget', (req, res) => {
  if (state.phase !== 1) return res.status(400).json({ error: 'Not in Phase 1' });
  const { teamId, modular, renewable, optimize } = req.body;
  if (teamId === undefined || modular === undefined || renewable === undefined || optimize === undefined) {
    return res.status(400).json({ error: 'teamId, modular, renewable, and optimize are required' });
  }
  const tid = parseInt(teamId);
  if (isNaN(tid) || tid < 1 || tid > state.numTeams) {
    return res.status(400).json({ error: 'Invalid team' });
  }
  const m = parseInt(modular), r = parseInt(renewable), o = parseInt(optimize);
  if (isNaN(m) || isNaN(r) || isNaN(o)) {
    return res.status(400).json({ error: 'modular, renewable, and optimize must be numbers' });
  }
  if (m + r + o !== 100) {
    return res.status(400).json({ error: `Budget values must sum to 100 (got ${m + r + o})` });
  }
  if (!(m >= 60 || r >= 60 || o >= 60)) {
    return res.status(400).json({ error: 'At least one budget category must be 60 or above' });
  }
  if (state.budgets[tid]) {
    return res.status(400).json({ error: 'Your team has already submitted a budget' });
  }
  state.budgets[tid] = { teamId: tid, modular: m, renewable: r, optimize: o };
  saveState();
  res.json({ ok: true });
});

// ── Admin API ───────────────────────────────────────────────────────────────

function checkPin(pin) {
  return String(pin) === ADMIN_PIN;
}

app.post('/admin/advance-phase', (req, res) => {
  if (!checkPin(req.body.pin)) return res.status(403).json({ error: 'Invalid PIN' });
  if (state.phase >= 4) return res.status(400).json({ error: 'Already finished' });
  const now = Date.now();
  if (now - lastAdvanceTime < 2000) {
    return res.status(429).json({ error: 'Please wait before advancing phase again' });
  }
  state.phase++;
  lastAdvanceTime = now;
  saveState();
  res.json({ phase: state.phase });
});

app.post('/admin/set-phase', (req, res) => {
  if (!checkPin(req.body.pin)) return res.status(403).json({ error: 'Invalid PIN' });
  const p = parseInt(req.body.phase);
  if (isNaN(p) || p < 1 || p > 4) return res.status(400).json({ error: 'Phase must be 1-4' });
  state.phase = p;
  saveState();
  res.json({ phase: state.phase });
});

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
  const teams = state.numTeams; // preserve team count
  state = freshState();
  state.numTeams = teams;
  nextId = 1;
  saveState();
  res.json({ ok: true });
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
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`\n  Strategy Showdown is running!\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}`);
  console.log(`  Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`  Display: http://localhost:${PORT}/display.html\n`);
});
