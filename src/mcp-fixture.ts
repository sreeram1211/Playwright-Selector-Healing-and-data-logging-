/**
 * MCP Fixture — Playwright fixture providing `resilientMCPPage` with
 * the full MCP integration (snapshot-based actions, 70+ MCP tools,
 * self-healing, and automatic a11y auditing).
 *
 * Usage in test files:
 *
 *   import { test, expect } from './mcp-fixture';
 *
 *   test('example with MCP', async ({ resilientMCPPage }) => {
 *     // Connect MCP (launches a browser managed by MCP server)
 *     await resilientMCPPage.connectMCP();
 *
 *     // Use MCP-powered actions
 *     await resilientMCPPage.mcpGoto('https://example.com');
 *     const snapshot = await resilientMCPPage.mcpSnapshot();
 *
 *     // Or use traditional Playwright actions (still self-healing)
 *     await resilientMCPPage.click('h1');
 *   });
 */

import { test as base } from '@playwright/test';
import { ResilientMCPPage } from './mcp-page';
import { buildReport, outputReport } from './reporter';
import { ResilientAuditorConfig, MCPConfig, DEFAULT_CONFIG } from './types';

export { expect } from '@playwright/test';

type MCPFixtures = {
  resilientMCPPage: ResilientMCPPage;
  auditorConfig: Partial<ResilientAuditorConfig>;
  mcpConfig: Partial<MCPConfig>;
};

export const test = base.extend<MCPFixtures>({
  auditorConfig: [{}, { option: true }],
  mcpConfig: [{ enabled: true }, { option: true }],

  resilientMCPPage: async ({ page, auditorConfig, mcpConfig }, use, testInfo) => {
    const config: Partial<ResilientAuditorConfig> = { ...auditorConfig };
    const reporterMode = config.reporterMode ?? DEFAULT_CONFIG.reporterMode;
    const reportDir = config.reportDir ?? DEFAULT_CONFIG.reportDir;

    const startTime = Date.now();
    const resilientMCPPage = new ResilientMCPPage(page, config, mcpConfig);

    // Auto-connect MCP if enabled.
    if (mcpConfig.enabled !== false) {
      await resilientMCPPage.connectMCP();
    }

    await use(resilientMCPPage);

    // Disconnect MCP and produce the report.
    await resilientMCPPage.disconnectMCP();

    const durationMs = Date.now() - startTime;
    const passed = testInfo.status === 'passed';

    const report = buildReport(
      testInfo.title,
      passed,
      resilientMCPPage.healingEvents,
      resilientMCPPage.a11yViolations,
      durationMs,
    );

    outputReport(report, reporterMode, reportDir);
  },
});
