import { defineConfig } from '@playwright/test';

// Resolve node path - use process.execPath (the node running this config)
const nodePath = process.execPath;

export default defineConfig({
  testDir: './tests',
  testMatch: 'roundsim-*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    navigationTimeout: 60000,
    headless: true,
    launchOptions: {
      executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1217/chrome-win64/chrome.exe',
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    },
  },
  timeout: 120000,
  webServer: {
    command: `"${nodePath}" tests/serve-dist.js`,
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
