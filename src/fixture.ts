/**
 * Custom Playwright fixture that provides a `resilientPage` object
 * with self-healing selectors and automatic accessibility scanning.
 *
 * Usage in test files:
 *
 *   import { test, expect } from './fixture';
 *
 *   test('example', async ({ resilientPage }) => {
 *     await resilientPage.goto('https://example.com');
 *     await resilientPage.click('#submit');
 *   });
 */

import { test as base } from '@playwright/test';
import { ResilientPage } from './resilient-page';
import { buildReport, outputReport } from './reporter';
import { ResilientAuditorConfig, DEFAULT_CONFIG } from './types';

// Re-export expect so consumers only need one import.
export { expect } from '@playwright/test';

/** Declare the extra fixtures we provide. */
type ResilientFixtures = {
  resilientPage: ResilientPage;
  auditorConfig: Partial<ResilientAuditorConfig>;
};

/**
 * Extended `test` object that provides the `resilientPage` fixture.
 *
 * Override `auditorConfig` in `test.use({})` to customize behaviour
 * per test file or per project.
 */
export const test = base.extend<ResilientFixtures>({
  // Default config — tests can override via test.use({ auditorConfig: {...} })
  auditorConfig: [{}, { option: true }],

  resilientPage: async ({ page, auditorConfig }, use, testInfo) => {
    const config: Partial<ResilientAuditorConfig> = { ...auditorConfig };

    // Resolve merged config for reporter settings.
    const reporterMode =
      config.reporterMode ?? DEFAULT_CONFIG.reporterMode;
    const reportDir = config.reportDir ?? DEFAULT_CONFIG.reportDir;

    const startTime = Date.now();
    const resilientPage = new ResilientPage(page, config);

    // Hand the fixture to the test.
    await use(resilientPage);

    // After the test finishes — produce the report.
    const durationMs = Date.now() - startTime;
    const passed = testInfo.status === 'passed';

    const report = buildReport(
      testInfo.title,
      passed,
      resilientPage.healingEvents,
      resilientPage.a11yViolations,
      durationMs,
    );

    outputReport(report, reporterMode, reportDir);
  },
});
