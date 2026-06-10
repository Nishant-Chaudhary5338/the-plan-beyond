import { defineConfig, devices } from '@playwright/test';

// Dedicated config for responsive screenshot capture of the "My People" feature.
// Kept separate from playwright.config.ts so `pnpm e2e` (functional + a11y) and
// `pnpm screenshots` (visual sweep) never run each other's specs.
//
// The spec itself drives the viewport sizes, so we only need a single Chromium
// project here. Output PNGs land in ./screenshots/my-people/.
const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './visual',
  fullyParallel: false,
  workers: 1,
  // One retry so a transient timeout just re-captures rather than leaving a gap.
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // Capture deterministic images: disable animations so springs/toasts settle.
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run server & vite --port 5174',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
