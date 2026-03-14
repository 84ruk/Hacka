import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Cargar .env.e2e si existe (E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, PLAYWRIGHT_BASE_URL)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env.e2e') });
} catch {
  // dotenv opcional
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: undefined,
});
