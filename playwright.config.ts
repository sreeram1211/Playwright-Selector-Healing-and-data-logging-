import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    trace: 'off',
  },
  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
    },
    {
      name: 'example',
      testDir: './tests/example',
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      timeout: 90_000,
      use: {
        headless: true,
        viewport: { width: 1280, height: 720 },
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },
  ],
});
