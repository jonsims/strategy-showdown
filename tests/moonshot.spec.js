const { test, expect } = require('@playwright/test');

// Reset state before each test
test.beforeEach(async ({ request }) => {
  await request.post('/admin/reset', {
    data: { pin: '2030' },
  });
});

// ── API Tests ───────────────────────────────────────────────────────────────

test('GET /api/state returns valid JSON with moonshots and numTeams', async ({ request }) => {
  const res = await request.get('/api/state');
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data).toHaveProperty('numTeams');
  expect(data).toHaveProperty('moonshots');
  expect(data.numTeams).toBeGreaterThanOrEqual(1);
  expect(Object.keys(data.moonshots)).toHaveLength(0);
});

test('POST /api/moonshot succeeds with valid data', async ({ request }) => {
  const res = await request.post('/api/moonshot', {
    data: {
      teamId: 1, year: '2030', goal: 'Net zero data centers',
      metric: 'MT CO2', targetNumber: '0', funding: '$2B',
      leverageLevel: 'Design', costBearer: 'Microsoft shareholders'
    },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.ok).toBe(true);

  // Verify it appears in state
  const state = await (await request.get('/api/state')).json();
  expect(state.moonshots['1']).toBeDefined();
  expect(state.moonshots['1'].goal).toBe('Net zero data centers');
});

test('POST /api/moonshot rejects duplicate team', async ({ request }) => {
  await request.post('/api/moonshot', {
    data: {
      teamId: 1, year: '2030', goal: 'Goal 1', metric: 'M', targetNumber: '1',
      funding: '$1B', leverageLevel: 'Intent', costBearer: 'Everyone'
    },
  });
  const res = await request.post('/api/moonshot', {
    data: {
      teamId: 1, year: '2031', goal: 'Goal 2', metric: 'M2', targetNumber: '2',
      funding: '$2B', leverageLevel: 'Parameters', costBearer: 'Nobody'
    },
  });
  expect(res.ok()).toBeFalsy();
  const data = await res.json();
  expect(data.error).toContain('already submitted');
});

test('POST /api/moonshot rejects invalid leverage level', async ({ request }) => {
  const res = await request.post('/api/moonshot', {
    data: {
      teamId: 1, year: '2030', goal: 'Goal', metric: 'M', targetNumber: '1',
      funding: '$1B', leverageLevel: 'InvalidLevel', costBearer: 'Someone'
    },
  });
  expect(res.ok()).toBeFalsy();
});

test('POST /api/moonshot rejects missing fields', async ({ request }) => {
  const res = await request.post('/api/moonshot', {
    data: { teamId: 1, year: '2030' },
  });
  expect(res.ok()).toBeFalsy();
  const data = await res.json();
  expect(data.error).toContain('required');
});

test('POST /api/moonshot rejects invalid team number', async ({ request }) => {
  const res = await request.post('/api/moonshot', {
    data: {
      teamId: 99, year: '2030', goal: 'Goal', metric: 'M', targetNumber: '1',
      funding: '$1B', leverageLevel: 'Design', costBearer: 'Someone'
    },
  });
  expect(res.ok()).toBeFalsy();
  expect((await res.json()).error).toContain('Invalid team');
});

test('POST /api/moonshot rejects goal over 280 chars', async ({ request }) => {
  const res = await request.post('/api/moonshot', {
    data: {
      teamId: 1, year: '2030', goal: 'x'.repeat(281), metric: 'M', targetNumber: '1',
      funding: '$1B', leverageLevel: 'Design', costBearer: 'Someone'
    },
  });
  expect(res.ok()).toBeFalsy();
});

test('Admin load-dummy populates moonshots for all teams', async ({ request }) => {
  const res = await request.post('/admin/load-dummy', { data: { pin: '2030' } });
  expect(res.ok()).toBeTruthy();

  const state = await (await request.get('/api/state')).json();
  expect(Object.keys(state.moonshots).length).toBe(state.numTeams);
});

test('Admin reset clears all moonshots', async ({ request }) => {
  // Load dummy first
  await request.post('/admin/load-dummy', { data: { pin: '2030' } });
  let state = await (await request.get('/api/state')).json();
  expect(Object.keys(state.moonshots).length).toBeGreaterThan(0);

  // Reset
  await request.post('/admin/reset', { data: { pin: '2030' } });
  state = await (await request.get('/api/state')).json();
  expect(Object.keys(state.moonshots)).toHaveLength(0);
});

test('Admin set-teams changes team count', async ({ request }) => {
  await request.post('/admin/set-teams', { data: { pin: '2030', numTeams: 5 } });
  const state = await (await request.get('/api/state')).json();
  expect(state.numTeams).toBe(5);
});

test('Admin rejects wrong PIN', async ({ request }) => {
  const res = await request.post('/admin/reset', { data: { pin: '9999' } });
  expect(res.status()).toBe(403);
});

// ── Browser Tests ───────────────────────────────────────────────────────────

test('moonshot.html loads and shows team number field', async ({ page }) => {
  await page.goto('/moonshot.html');
  await expect(page.locator('#team-number')).toBeVisible();
  await expect(page.locator('#teammates')).toBeVisible();
  await expect(page.locator('h1')).toContainText('Moonshot');
});

test('moonshot.html submit button disabled until form filled', async ({ page }) => {
  await page.goto('/moonshot.html');
  const btn = page.locator('#btn-submit');
  await expect(btn).toBeDisabled();

  // Fill team info
  await page.fill('#team-number', '1');
  await page.fill('#teammates', 'Alice, Bob');
  await expect(btn).toBeDisabled(); // Still disabled - form not filled

  // Fill all fields
  await page.selectOption('#ms-year', '2030');
  await page.fill('#ms-metric', 'PUE');
  await page.fill('#ms-target', '1.0');
  await page.fill('#ms-goal', 'Test goal');
  await page.fill('#ms-funding', '$1B');
  await page.selectOption('#ms-leverage', 'Design');
  await page.fill('#ms-cost', 'Everyone');

  await expect(btn).toBeEnabled();
});

test('moonshot.html full submit flow', async ({ page }) => {
  await page.goto('/moonshot.html');

  // Fill team info
  await page.fill('#team-number', '1');
  await page.fill('#teammates', 'Alice, Bob, Charlie');

  // Fill form
  await page.selectOption('#ms-year', '2030');
  await page.fill('#ms-metric', 'Carbon intensity');
  await page.fill('#ms-target', 'Net zero');
  await page.fill('#ms-goal', 'Achieve net-zero operations by 2030');
  await page.fill('#ms-funding', '10% Azure revenue');
  await page.selectOption('#ms-leverage', 'Intent');
  await page.fill('#ms-cost', 'Cloud customers');

  // Submit
  await page.click('#btn-submit');

  // Should show success
  await expect(page.locator('#success-section')).toBeVisible();
  await expect(page.locator('#form-section')).toBeHidden();

  // Tracker should show the submission
  await expect(page.locator('.tracker-card')).toHaveCount(1, { timeout: 5000 });
});

test('moonshot.html shows error for duplicate team submission', async ({ page, request }) => {
  // Submit for team 1 via API
  await request.post('/api/moonshot', {
    data: {
      teamId: 1, year: '2030', goal: 'Goal', metric: 'M', targetNumber: '1',
      funding: '$1B', leverageLevel: 'Design', costBearer: 'Someone'
    },
  });

  await page.goto('/moonshot.html');
  await page.fill('#team-number', '1');
  await page.fill('#teammates', 'Test');
  await page.selectOption('#ms-year', '2030');
  await page.fill('#ms-metric', 'M');
  await page.fill('#ms-target', '1');
  await page.fill('#ms-goal', 'Duplicate goal');
  await page.fill('#ms-funding', '$1B');
  await page.selectOption('#ms-leverage', 'Design');
  await page.fill('#ms-cost', 'Someone');
  await page.click('#btn-submit');

  // Should show error banner
  await expect(page.locator('#error-banner')).toBeVisible();
  await expect(page.locator('#error-banner')).toContainText('already submitted');
});

test('display.html shows moonshot cards', async ({ page, request }) => {
  // Load dummy data
  await request.post('/admin/load-dummy', { data: { pin: '2030' } });

  await page.goto('/display.html');
  // Wait for poll
  await page.waitForTimeout(3000);

  // Should show moonshot cards
  const cards = page.locator('.card');
  await expect(cards).not.toHaveCount(0);

  // Counter should show team count
  await expect(page.locator('#counter')).toContainText('of');
});

test('display.html shows waiting message when no moonshots', async ({ page }) => {
  await page.goto('/display.html');
  await page.waitForTimeout(3000);
  await expect(page.locator('.waiting')).toBeVisible();
});

test('admin.html PIN gate works', async ({ page }) => {
  await page.goto('/admin.html');
  await expect(page.locator('#pin-gate')).toBeVisible();
  await expect(page.locator('#admin-panel')).toBeHidden();

  // Enter correct PIN
  await page.fill('#pin-input', '2030');
  await page.waitForTimeout(1000);

  await expect(page.locator('#pin-gate')).toBeHidden();
  await expect(page.locator('#admin-panel')).toBeVisible();
});

test('admin.html shows moonshot table after dummy load', async ({ page }) => {
  await page.goto('/admin.html');
  await page.fill('#pin-input', '2030');
  await page.waitForTimeout(1000);

  // Click load dummy
  page.on('dialog', dialog => dialog.accept());
  await page.click('#btn-dummy');
  await page.waitForTimeout(2000);

  // Table should have rows
  const rows = page.locator('#tbl-moonshots tr');
  await expect(rows).not.toHaveCount(0);
});
