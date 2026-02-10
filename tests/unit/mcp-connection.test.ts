import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MCPConnection } from '../../src/mcp-connection.ts';
import { DEFAULT_MCP_CONFIG } from '../../src/types.ts';
import type { MCPConfig, MCPToolResult } from '../../src/types.ts';

// ---------------------------------------------------------------------------
// MCPConnection — constructor and defaults
// ---------------------------------------------------------------------------

describe('MCPConnection — constructor', () => {
  it('creates with default config', () => {
    const conn = new MCPConnection();
    assert.equal(conn.connected, false);
  });

  it('accepts partial config overrides', () => {
    const conn = new MCPConnection({
      enabled: true,
      browserName: 'firefox',
      headless: false,
    });
    assert.equal(conn.connected, false);
  });

  it('starts disconnected', () => {
    const conn = new MCPConnection({ enabled: true });
    assert.equal(conn.connected, false);
  });
});

// ---------------------------------------------------------------------------
// MCPConnection — pre-connect error handling
// ---------------------------------------------------------------------------

describe('MCPConnection — error handling before connect', () => {
  it('callTool throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.callTool('browser_snapshot'),
      /MCP connection not established/,
    );
  });

  it('listTools throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.listTools(),
      /MCP connection not established/,
    );
  });

  it('navigate throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.navigate('https://example.com'),
      /MCP connection not established/,
    );
  });

  it('snapshot throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.snapshot(),
      /MCP connection not established/,
    );
  });

  it('click throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.click('ref1'),
      /MCP connection not established/,
    );
  });

  it('fill throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.fill('ref1', 'value'),
      /MCP connection not established/,
    );
  });

  it('type throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.type('hello'),
      /MCP connection not established/,
    );
  });

  it('pressKey throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.pressKey('Enter'),
      /MCP connection not established/,
    );
  });

  it('hover throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.hover('ref1'),
      /MCP connection not established/,
    );
  });

  it('selectOption throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.selectOption('ref1', ['opt1']),
      /MCP connection not established/,
    );
  });

  it('screenshot throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.screenshot(),
      /MCP connection not established/,
    );
  });

  it('evaluate throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.evaluate('1 + 1'),
      /MCP connection not established/,
    );
  });

  it('waitFor throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.waitFor('hello'),
      /MCP connection not established/,
    );
  });

  it('waitFor with number throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.waitFor(1000),
      /MCP connection not established/,
    );
  });

  it('consoleMessages throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.consoleMessages(),
      /MCP connection not established/,
    );
  });

  it('tabs throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.tabs(),
      /MCP connection not established/,
    );
  });

  it('goBack throws if not connected', async () => {
    const conn = new MCPConnection();
    await assert.rejects(
      () => conn.goBack(),
      /MCP connection not established/,
    );
  });
});

// ---------------------------------------------------------------------------
// MCPConnection — extractText helper
// ---------------------------------------------------------------------------

describe('MCPConnection — extractText', () => {
  it('extracts text from content array', () => {
    const conn = new MCPConnection();
    const result: MCPToolResult = {
      toolName: 'browser_snapshot',
      success: true,
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
      ],
      raw: {},
    };
    assert.equal(conn.extractText(result), 'Hello\nWorld');
  });

  it('skips non-text content items', () => {
    const conn = new MCPConnection();
    const result: MCPToolResult = {
      toolName: 'browser_screenshot',
      success: true,
      content: [
        { type: 'image', data: 'base64data', mimeType: 'image/png' },
        { type: 'text', text: 'Caption' },
      ],
      raw: {},
    };
    assert.equal(conn.extractText(result), 'Caption');
  });

  it('returns empty string for no text content', () => {
    const conn = new MCPConnection();
    const result: MCPToolResult = {
      toolName: 'test',
      success: true,
      content: [{ type: 'image', data: 'abc' }],
      raw: {},
    };
    assert.equal(conn.extractText(result), '');
  });

  it('handles empty content array', () => {
    const conn = new MCPConnection();
    const result: MCPToolResult = {
      toolName: 'test',
      success: true,
      content: [],
      raw: {},
    };
    assert.equal(conn.extractText(result), '');
  });
});

// ---------------------------------------------------------------------------
// MCPConnection — disconnect when not connected
// ---------------------------------------------------------------------------

describe('MCPConnection — disconnect', () => {
  it('disconnect is safe to call when not connected', async () => {
    const conn = new MCPConnection();
    // Should not throw.
    await conn.disconnect();
    assert.equal(conn.connected, false);
  });

  it('disconnect can be called multiple times safely', async () => {
    const conn = new MCPConnection();
    await conn.disconnect();
    await conn.disconnect();
    assert.equal(conn.connected, false);
  });
});
