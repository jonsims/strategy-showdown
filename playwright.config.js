const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:3020',
  },
  webServer: {
    command: 'npm start',
    port: 3020,
    reuseExistingServer: false,
  },
});
