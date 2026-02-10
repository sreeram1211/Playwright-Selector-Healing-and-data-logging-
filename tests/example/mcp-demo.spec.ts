/**
 * Example test demonstrating Playwright MCP integration with The Resilient Auditor.
 *
 * This test requires:
 *   1. Playwright browsers installed (`npx playwright install chromium`)
 *   2. The @playwright/mcp and @modelcontextprotocol/sdk packages (already in devDependencies)
 *
 * Run with:
 *   npx playwright test --project=example tests/example/mcp-demo.spec.ts
 */

import { test, expect } from '../../src/mcp-fixture';

// -----------------------------------------------------------------------
// Example 1: MCP snapshot-based interaction
// -----------------------------------------------------------------------

test.describe('MCP Demo — Snapshot-based Interaction', () => {
  test.use({
    mcpConfig: {
      enabled: true,
      browserName: 'chromium',
      headless: true,
      capabilities: ['core', 'core-input', 'core-navigation'],
    },
    auditorConfig: {
      a11yEnabled: true,
      reporterMode: 'console',
    },
  });

  test('navigate and get accessibility snapshot', async ({ resilientMCPPage }) => {
    // Navigate using MCP (uses the MCP-managed browser)
    await resilientMCPPage.mcpGoto('https://example.com');

    // Get the accessibility snapshot — a structured tree of the page
    const snapshot = await resilientMCPPage.mcpSnapshot();

    // The snapshot contains the page structure as text
    expect(snapshot).toBeTruthy();
    expect(snapshot.length).toBeGreaterThan(0);
  });

  test('list available MCP tools', async ({ resilientMCPPage }) => {
    const tools = await resilientMCPPage.mcpListTools();

    // Should have at least the core browser tools
    expect(tools.length).toBeGreaterThan(10);

    // Check for key tools
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('browser_navigate');
    expect(toolNames).toContain('browser_snapshot');
    expect(toolNames).toContain('browser_click');
  });

  test('evaluate JavaScript via MCP', async ({ resilientMCPPage }) => {
    await resilientMCPPage.mcpGoto('https://example.com');

    const result = await resilientMCPPage.mcpEvaluate('document.title');
    expect(result.success).toBe(true);
  });
});

// -----------------------------------------------------------------------
// Example 2: Hybrid — MCP + traditional Playwright
// -----------------------------------------------------------------------

test.describe('MCP Demo — Hybrid MCP + Playwright', () => {
  test.use({
    mcpConfig: {
      enabled: true,
      headless: true,
    },
    auditorConfig: {
      ai: false,
      a11yEnabled: false,
      reporterMode: 'console',
    },
  });

  test('use both MCP and Playwright APIs in the same test', async ({
    resilientMCPPage,
  }) => {
    // MCP-powered navigation (uses MCP browser)
    await resilientMCPPage.mcpGoto('https://example.com');
    const mcpSnapshot = await resilientMCPPage.mcpSnapshot();
    expect(mcpSnapshot).toContain('Example Domain');

    // Traditional Playwright navigation (uses fixture page)
    await resilientMCPPage.goto('https://example.com');
    const text = await resilientMCPPage.textContent('h1');
    expect(text).toContain('Example Domain');
  });
});

// -----------------------------------------------------------------------
// Example 3: MCP with custom test ID attribute
// -----------------------------------------------------------------------

test.describe('MCP Demo — Custom Configuration', () => {
  test.use({
    mcpConfig: {
      enabled: true,
      headless: true,
      testIdAttribute: 'data-cy',
      viewport: { width: 1920, height: 1080 },
      capabilities: ['core', 'core-input', 'core-navigation', 'core-tabs', 'testing'],
    },
    auditorConfig: {
      a11yEnabled: true,
      reporterMode: 'both',
      reportDir: './reports/mcp-demo',
    },
  });

  test('navigate with custom viewport and testid', async ({ resilientMCPPage }) => {
    await resilientMCPPage.mcpGoto('https://example.com');
    const snapshot = await resilientMCPPage.mcpSnapshot();
    expect(snapshot).toBeTruthy();
  });
});
