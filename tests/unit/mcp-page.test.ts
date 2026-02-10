import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for ResilientMCPPage.
 * These test the class without a real browser or MCP server.
 */

// ---------------------------------------------------------------------------
// Mock helpers (reused from resilient-page tests)
// ---------------------------------------------------------------------------

function createMockLocator() {
  const loc = {
    click: mock.fn(async () => {}),
    fill: mock.fn(async () => {}),
    first: mock.fn(() => loc),
    waitFor: mock.fn(async () => {}),
    textContent: mock.fn(async () => 'text'),
    innerText: mock.fn(async () => 'inner'),
    inputValue: mock.fn(async () => 'value'),
    isVisible: mock.fn(async () => true),
    count: mock.fn(async () => 1),
  };
  return loc;
}

function createMockPage() {
  const defaultLocator = createMockLocator();
  return {
    locator: mock.fn(() => defaultLocator),
    content: mock.fn(async () => '<html></html>'),
    url: mock.fn(() => 'https://example.com'),
    goto: mock.fn(async () => {}),
    evaluate: mock.fn(async () => {}),
  };
}

// ---------------------------------------------------------------------------
// ResilientMCPPage — constructor
// ---------------------------------------------------------------------------

describe('ResilientMCPPage — constructor', () => {
  it('creates with default config', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    assert.ok(rp);
    assert.ok(rp.mcp);
    assert.equal(rp.mcp.connected, false);
    assert.deepEqual(rp.healingEvents, []);
    assert.deepEqual(rp.a11yViolations, []);
  });

  it('accepts auditor and MCP config overrides', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(
      page as any,
      { a11yEnabled: false, locatorTimeout: 2000 },
      { browserName: 'firefox', headless: false },
    );
    assert.ok(rp);
  });

  it('inherits ResilientPage capabilities', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any, { a11yEnabled: false });

    // Can use parent's click (Playwright-based)
    await rp.click('#btn');
    assert.equal(page.locator.mock.callCount(), 1);
  });
});

// ---------------------------------------------------------------------------
// ResilientMCPPage — MCP methods before connect
// ---------------------------------------------------------------------------

describe('ResilientMCPPage — MCP methods before connect', () => {
  it('mcpGoto throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpGoto('https://example.com'),
      /MCP not connected/,
    );
  });

  it('mcpSnapshot throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpSnapshot(),
      /MCP not connected/,
    );
  });

  it('mcpClick throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpClick('ref1'),
      /MCP not connected/,
    );
  });

  it('mcpFill throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpFill([{ ref: 'ref1', value: 'hello' }]),
      /MCP not connected/,
    );
  });

  it('mcpType throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpType('hello'),
      /MCP not connected/,
    );
  });

  it('mcpPressKey throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpPressKey('Enter'),
      /MCP not connected/,
    );
  });

  it('mcpHover throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpHover('ref1'),
      /MCP not connected/,
    );
  });

  it('mcpSelectOption throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpSelectOption('ref1', ['opt']),
      /MCP not connected/,
    );
  });

  it('mcpScreenshot throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpScreenshot(),
      /MCP not connected/,
    );
  });

  it('mcpEvaluate throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpEvaluate('document.title'),
      /MCP not connected/,
    );
  });

  it('mcpWaitFor throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpWaitFor('text'),
      /MCP not connected/,
    );
  });

  it('mcpGoBack throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpGoBack(),
      /MCP not connected/,
    );
  });

  it('mcpConsoleMessages throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpConsoleMessages(),
      /MCP not connected/,
    );
  });

  it('mcpTabs throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpTabs(),
      /MCP not connected/,
    );
  });

  it('mcpCallTool throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpCallTool('browser_snapshot'),
      /MCP not connected/,
    );
  });

  it('mcpListTools throws if not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    await assert.rejects(
      () => rp.mcpListTools(),
      /MCP not connected/,
    );
  });
});

// ---------------------------------------------------------------------------
// ResilientMCPPage — disconnect
// ---------------------------------------------------------------------------

describe('ResilientMCPPage — disconnect', () => {
  it('disconnectMCP is safe when not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    const rp = new ResilientMCPPage(page as any);

    // Should not throw.
    await rp.disconnectMCP();
    assert.equal(rp.mcp.connected, false);
  });
});

// ---------------------------------------------------------------------------
// ResilientMCPPage — getHealingContext
// ---------------------------------------------------------------------------

describe('ResilientMCPPage — getHealingContext', () => {
  it('falls back to page.content() when MCP is not connected', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    page.content = mock.fn(async () => '<html>raw</html>');
    const rp = new ResilientMCPPage(page as any, {}, { useSnapshotsForHealing: true });

    const context = await rp.getHealingContext();
    assert.equal(context, '<html>raw</html>');
  });

  it('falls back to page.content() when useSnapshotsForHealing is false', async () => {
    const { ResilientMCPPage } = await import('../../src/mcp-page.ts');
    const page = createMockPage();
    page.content = mock.fn(async () => '<html>raw</html>');
    const rp = new ResilientMCPPage(page as any, {}, { useSnapshotsForHealing: false });

    const context = await rp.getHealingContext();
    assert.equal(context, '<html>raw</html>');
  });
});

// ---------------------------------------------------------------------------
// MCP types
// ---------------------------------------------------------------------------

describe('MCP types — DEFAULT_MCP_CONFIG', () => {
  it('has expected default values', async () => {
    const { DEFAULT_MCP_CONFIG } = await import('../../src/types.ts');
    assert.equal(DEFAULT_MCP_CONFIG.enabled, false);
    assert.equal(DEFAULT_MCP_CONFIG.browserName, 'chromium');
    assert.equal(DEFAULT_MCP_CONFIG.headless, true);
    assert.deepEqual(DEFAULT_MCP_CONFIG.viewport, { width: 1280, height: 720 });
    assert.equal(DEFAULT_MCP_CONFIG.useSnapshotsForHealing, true);
    assert.equal(DEFAULT_MCP_CONFIG.testIdAttribute, 'data-testid');
    assert.ok(Array.isArray(DEFAULT_MCP_CONFIG.capabilities));
    assert.ok(DEFAULT_MCP_CONFIG.capabilities.includes('core'));
  });
});
