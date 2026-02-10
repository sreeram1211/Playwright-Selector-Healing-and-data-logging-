/**
 * MCP Connection Manager — manages the lifecycle of a Playwright MCP server
 * and provides a client interface to call MCP tools programmatically.
 *
 * Uses @playwright/mcp's `createConnection()` with in-process transport
 * from @modelcontextprotocol/sdk so the server runs inside the test process
 * without spawning a subprocess.
 */

import type { MCPConfig, MCPToolResult } from './types';
import { DEFAULT_MCP_CONFIG } from './types';

/**
 * Wrapper around an MCP server+client pair running in the same process.
 * Provides typed methods to call any Playwright MCP tool and parse responses.
 */
export class MCPConnection {
  private client: InstanceType<typeof import('@modelcontextprotocol/sdk/client/index.js').Client> | null = null;
  private transport: { clientTransport: unknown; serverTransport: unknown } | null = null;
  private server: unknown = null;
  private _connected = false;

  private readonly config: MCPConfig;

  constructor(config: Partial<MCPConfig> = {}) {
    this.config = { ...DEFAULT_MCP_CONFIG, ...config } as MCPConfig;
  }

  /** Whether the MCP connection is active. */
  get connected(): boolean {
    return this._connected;
  }

  /**
   * Start the MCP server and connect an in-process client.
   *
   * Dynamically imports @playwright/mcp and @modelcontextprotocol/sdk
   * so these remain optional dependencies — the project still works
   * without them if MCP is disabled.
   */
  async connect(): Promise<void> {
    if (this._connected) return;

    const { createConnection } = await import('@playwright/mcp');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');

    // Build the @playwright/mcp Config from our MCPConfig.
    const pwMcpConfig: Record<string, unknown> = {
      browser: {
        browserName: this.config.browserName ?? 'chromium',
        launchOptions: {
          headless: this.config.headless ?? true,
        },
        contextOptions: this.config.viewport
          ? { viewport: this.config.viewport }
          : undefined,
      },
      capabilities: this.config.capabilities ?? DEFAULT_MCP_CONFIG.capabilities,
      testIdAttribute: this.config.testIdAttribute,
      imageResponses: 'omit',
      snapshot: { mode: 'full' },
    };
    if (this.config.network) {
      pwMcpConfig.network = this.config.network;
    }
    if (this.config.outputDir) {
      pwMcpConfig.outputDir = this.config.outputDir;
    }

    // Create the MCP server.
    this.server = await createConnection(pwMcpConfig as any);

    // Create a linked in-memory transport pair.
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    this.transport = { clientTransport, serverTransport };

    // Connect the server side.
    await (this.server as any).connect(serverTransport);

    // Create and connect the client side.
    this.client = new Client(
      { name: 'resilient-auditor', version: '1.0.0' },
      { capabilities: {} },
    );
    await this.client.connect(clientTransport);

    this._connected = true;
  }

  /**
   * Call an MCP tool by name with the given arguments.
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolResult> {
    if (!this.client || !this._connected) {
      throw new Error('MCP connection not established. Call connect() first.');
    }

    const result = await this.client.callTool({ name: toolName, arguments: args });

    const content = (result.content ?? []) as Array<{
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
    }>;

    return {
      toolName,
      success: !result.isError,
      content,
      raw: result,
    };
  }

  /**
   * List all tools available on the MCP server.
   */
  async listTools(): Promise<Array<{ name: string; description?: string }>> {
    if (!this.client || !this._connected) {
      throw new Error('MCP connection not established. Call connect() first.');
    }

    const result = await this.client.listTools();
    return (result.tools ?? []).map((t: { name: string; description?: string }) => ({
      name: t.name,
      description: t.description,
    }));
  }

  // -----------------------------------------------------------------------
  // Convenience wrappers for the most common MCP tools
  // -----------------------------------------------------------------------

  /** Navigate the MCP browser to a URL. */
  async navigate(url: string): Promise<MCPToolResult> {
    return this.callTool('browser_navigate', { url });
  }

  /** Get the current accessibility snapshot of the page. */
  async snapshot(): Promise<string> {
    const result = await this.callTool('browser_snapshot');
    return this.extractText(result);
  }

  /** Click an element identified by a Playwright ref string from the snapshot. */
  async click(ref: string): Promise<MCPToolResult> {
    return this.callTool('browser_click', { element: ref, ref });
  }

  /** Fill a form field identified by a ref string. */
  async fill(ref: string, value: string): Promise<MCPToolResult> {
    return this.callTool('browser_fill_form', {
      fields: [{ ref, value }],
    });
  }

  /** Type text into a focused element. */
  async type(text: string): Promise<MCPToolResult> {
    return this.callTool('browser_type', { text });
  }

  /** Press a keyboard key. */
  async pressKey(key: string): Promise<MCPToolResult> {
    return this.callTool('browser_press_key', { key });
  }

  /** Hover over an element. */
  async hover(ref: string): Promise<MCPToolResult> {
    return this.callTool('browser_hover', { element: ref, ref });
  }

  /** Select an option in a dropdown. */
  async selectOption(ref: string, values: string[]): Promise<MCPToolResult> {
    return this.callTool('browser_select_option', { element: ref, ref, values });
  }

  /** Take a screenshot (returns base64 image data). */
  async screenshot(): Promise<MCPToolResult> {
    return this.callTool('browser_take_screenshot');
  }

  /** Evaluate JavaScript in the page context. */
  async evaluate(expression: string): Promise<MCPToolResult> {
    return this.callTool('browser_evaluate', { expression });
  }

  /** Wait for text to appear or a specific timeout. */
  async waitFor(textOrTime: string | number): Promise<MCPToolResult> {
    if (typeof textOrTime === 'number') {
      return this.callTool('browser_wait_for', { time: textOrTime });
    }
    return this.callTool('browser_wait_for', { text: textOrTime });
  }

  /** Get console messages from the browser. */
  async consoleMessages(): Promise<MCPToolResult> {
    return this.callTool('browser_console_messages');
  }

  /** Manage browser tabs. */
  async tabs(): Promise<MCPToolResult> {
    return this.callTool('browser_tabs');
  }

  /** Navigate back. */
  async goBack(): Promise<MCPToolResult> {
    return this.callTool('browser_navigate_back');
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Extract text content from an MCPToolResult. */
  extractText(result: MCPToolResult): string {
    return result.content
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text!)
      .join('\n');
  }

  /**
   * Tear down the MCP connection: close client, server, and browser.
   */
  async disconnect(): Promise<void> {
    if (!this._connected) return;

    try {
      if (this.client) {
        await this.client.close();
      }
    } catch {
      // Client may already be closed.
    }

    try {
      if (this.server && typeof (this.server as any).close === 'function') {
        await (this.server as any).close();
      }
    } catch {
      // Server may already be closed.
    }

    this.client = null;
    this.server = null;
    this.transport = null;
    this._connected = false;
  }
}
