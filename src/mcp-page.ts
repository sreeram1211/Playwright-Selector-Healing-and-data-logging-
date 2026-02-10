/**
 * ResilientMCPPage — extends ResilientPage with Playwright MCP capabilities.
 *
 * This class adds:
 *   - MCP tool-based browser actions (snapshot-driven, ref-based interaction)
 *   - Accessibility-snapshot-powered healing (uses structured a11y tree
 *     instead of raw HTML for more reliable AI healing)
 *   - Direct access to any of the 70+ MCP tools
 *
 * It inherits all self-healing, a11y auditing, and reporting from ResilientPage.
 */

import type { Page } from '@playwright/test';
import { ResilientPage } from './resilient-page';
import { MCPConnection } from './mcp-connection';
import type {
  ResilientAuditorConfig,
  MCPConfig,
  MCPToolResult,
} from './types';
import { DEFAULT_MCP_CONFIG } from './types';

export class ResilientMCPPage extends ResilientPage {
  /** The MCP connection for tool-based interactions. */
  readonly mcp: MCPConnection;

  /** MCP configuration. */
  private readonly mcpConfig: MCPConfig;

  constructor(
    page: Page,
    config: Partial<ResilientAuditorConfig> = {},
    mcpConfig: Partial<MCPConfig> = {},
  ) {
    super(page, config);
    this.mcpConfig = { ...DEFAULT_MCP_CONFIG, ...mcpConfig } as MCPConfig;
    this.mcp = new MCPConnection(this.mcpConfig);
  }

  /**
   * Initialize the MCP connection.
   * Must be called before using any MCP-specific methods.
   */
  async connectMCP(): Promise<void> {
    await this.mcp.connect();
  }

  /**
   * Tear down the MCP connection.
   */
  async disconnectMCP(): Promise<void> {
    await this.mcp.disconnect();
  }

  // -----------------------------------------------------------------------
  // MCP-powered navigation
  // -----------------------------------------------------------------------

  /**
   * Navigate to a URL using the MCP browser.
   * Also triggers a11y scanning if enabled (via the parent class).
   */
  async mcpGoto(url: string): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.mcp.navigate(url);
    await this.triggerA11yScan('goto');
    return result;
  }

  // -----------------------------------------------------------------------
  // MCP-powered snapshot-based actions
  // -----------------------------------------------------------------------

  /**
   * Get the current accessibility snapshot from the MCP server.
   * This is a lightweight, structured representation of the page DOM
   * that LLMs can reason about more effectively than raw HTML.
   */
  async mcpSnapshot(): Promise<string> {
    this.ensureConnected();
    return this.mcp.snapshot();
  }

  /**
   * Click an element using its MCP ref (from the accessibility snapshot).
   * Runs a11y scan after the click.
   */
  async mcpClick(ref: string): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.mcp.click(ref);
    await this.triggerA11yScan('click');
    return result;
  }

  /**
   * Fill form fields using MCP.
   * Accepts an array of { ref, value } pairs for batch filling.
   */
  async mcpFill(
    fields: Array<{ ref: string; value: string }>,
  ): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.mcp.callTool('browser_fill_form', { fields });
    await this.triggerA11yScan('fill');
    return result;
  }

  /**
   * Type text into the currently focused element via MCP.
   */
  async mcpType(text: string): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.mcp.type(text);
    await this.triggerA11yScan('type');
    return result;
  }

  /**
   * Press a keyboard key via MCP.
   */
  async mcpPressKey(key: string): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.pressKey(key);
  }

  /**
   * Hover over an element via MCP.
   */
  async mcpHover(ref: string): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.hover(ref);
  }

  /**
   * Select a dropdown option via MCP.
   */
  async mcpSelectOption(
    ref: string,
    values: string[],
  ): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.mcp.selectOption(ref, values);
    await this.triggerA11yScan('select');
    return result;
  }

  /**
   * Take a screenshot via MCP.
   */
  async mcpScreenshot(): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.screenshot();
  }

  /**
   * Evaluate JavaScript in the browser via MCP.
   */
  async mcpEvaluate(expression: string): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.evaluate(expression);
  }

  /**
   * Wait for text to appear on the page or a time duration (ms).
   */
  async mcpWaitFor(textOrTime: string | number): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.waitFor(textOrTime);
  }

  /**
   * Go back in browser history via MCP.
   */
  async mcpGoBack(): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.mcp.goBack();
    await this.triggerA11yScan('navigate_back');
    return result;
  }

  /**
   * Get console messages from the browser via MCP.
   */
  async mcpConsoleMessages(): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.consoleMessages();
  }

  /**
   * List browser tabs via MCP.
   */
  async mcpTabs(): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.tabs();
  }

  // -----------------------------------------------------------------------
  // Direct MCP tool access
  // -----------------------------------------------------------------------

  /**
   * Call any MCP tool by name. Use this for tools not wrapped above.
   * See `mcpListTools()` for available tool names.
   */
  async mcpCallTool(
    toolName: string,
    args?: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    this.ensureConnected();
    return this.mcp.callTool(toolName, args);
  }

  /**
   * List all available MCP tools.
   */
  async mcpListTools(): Promise<Array<{ name: string; description?: string }>> {
    this.ensureConnected();
    return this.mcp.listTools();
  }

  // -----------------------------------------------------------------------
  // Snapshot-based self-healing override
  // -----------------------------------------------------------------------

  /**
   * Get the page content for healing purposes.
   * When MCP is connected and `useSnapshotsForHealing` is enabled, returns
   * the accessibility snapshot instead of raw HTML. This gives the AI healer
   * a structured, compact view of the page that's easier to reason about.
   */
  async getHealingContext(): Promise<string> {
    if (
      this.mcp.connected &&
      this.mcpConfig.useSnapshotsForHealing
    ) {
      try {
        return await this.mcp.snapshot();
      } catch {
        // Fall back to raw HTML if snapshot fails.
      }
    }
    return this.page.content();
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private ensureConnected(): void {
    if (!this.mcp.connected) {
      throw new Error(
        'MCP not connected. Call connectMCP() before using MCP methods.',
      );
    }
  }

  /**
   * Trigger an a11y scan on the Playwright page (reuses parent's mechanism).
   * This is called after MCP actions to maintain consistent a11y auditing.
   */
  private async triggerA11yScan(action: string): Promise<void> {
    // Access the parent's afterAction through the public interface.
    // We run the scan on the Playwright page object.
    try {
      const { runAccessibilityScan } = await import('./accessibility-scanner');
      const violations = await runAccessibilityScan(this.page, action);
      this.a11yViolations.push(...violations);
    } catch {
      // axe-core may fail on certain pages or when page is navigating.
    }
  }
}
