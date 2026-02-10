/**
 * Core type definitions for The Resilient Auditor.
 */

/** Severity levels for accessibility violations. */
export type A11ySeverity = 'minor' | 'moderate' | 'serious' | 'critical';

/** The severity levels we report on (filtering out noise). */
export const REPORTABLE_SEVERITIES: ReadonlySet<A11ySeverity> = new Set([
  'critical',
  'serious',
]);

/** A single accessibility violation captured during a test. */
export interface A11yViolation {
  /** axe-core rule ID (e.g., "color-contrast"). */
  ruleId: string;
  /** Severity impact. */
  severity: A11ySeverity;
  /** Human-readable description of the violation. */
  description: string;
  /** CSS selectors of the affected DOM nodes. */
  affectedNodes: string[];
  /** The URL where the violation was found. */
  url: string;
  /** The action that triggered the scan (e.g., "click", "fill", "goto"). */
  triggeringAction: string;
}

/** A record of a self-healing event where a selector was repaired. */
export interface HealingEvent {
  /** The original selector that failed. */
  originalSelector: string;
  /** The AI-suggested replacement selector. */
  healedSelector: string;
  /** The action being attempted (e.g., "click", "fill"). */
  action: string;
  /** ISO-8601 timestamp of the healing event. */
  timestamp: string;
  /** The AI provider that suggested the fix. */
  aiProvider: string;
}

/** Summary produced by the unified reporter at the end of a test. */
export interface TestReport {
  /** Name of the test. */
  testName: string;
  /** Whether the test passed. */
  passed: boolean;
  /** Total number of healing events. */
  healingCount: number;
  /** All healing events that occurred. */
  healingEvents: HealingEvent[];
  /** Total number of a11y violations (critical + serious only). */
  a11yViolationCount: number;
  /** All a11y violations found. */
  a11yViolations: A11yViolation[];
  /** Total test duration in milliseconds. */
  durationMs: number;
}

/**
 * Configuration for the AI provider used for selector healing.
 * Supports Anthropic and OpenAI APIs, or a custom implementation.
 */
export interface AIProviderConfig {
  /** Which AI provider to use. */
  provider: 'anthropic' | 'openai' | 'custom';
  /** API key (read from env if not supplied). */
  apiKey?: string;
  /** Model identifier (e.g., "claude-sonnet-4-20250514", "gpt-4o"). */
  model?: string;
  /** Base URL override for the API endpoint. */
  baseUrl?: string;
  /**
   * Custom healing function. Required when provider is 'custom'.
   * Receives the failed selector and a simplified HTML snapshot,
   * and returns a suggested replacement selector.
   */
  customHealFn?: (failedSelector: string, htmlSnapshot: string) => Promise<string>;
}

/** Top-level configuration for The Resilient Auditor fixture. */
export interface ResilientAuditorConfig {
  /** AI provider settings for self-healing. Set to `false` to disable healing. */
  ai: AIProviderConfig | false;
  /** Whether to run accessibility scans after actions. Defaults to true. */
  a11yEnabled?: boolean;
  /** Timeout in ms for the initial locator attempt before triggering healing. */
  locatorTimeout?: number;
  /** Maximum number of healing retries per action. Defaults to 1. */
  maxHealingRetries?: number;
  /** Reporter output mode. Defaults to 'console'. */
  reporterMode?: 'console' | 'json' | 'both';
  /** Directory path for JSON report output. Defaults to './reports'. */
  reportDir?: string;
}

/** Default configuration values. */
export const DEFAULT_CONFIG: Required<Omit<ResilientAuditorConfig, 'ai'>> & {
  ai: false;
} = {
  ai: false,
  a11yEnabled: true,
  locatorTimeout: 5000,
  maxHealingRetries: 1,
  reporterMode: 'console',
  reportDir: './reports',
};

/**
 * The interface exposed by our AI healing service.
 */
export interface AIHealingService {
  /**
   * Given a failed selector and an HTML snapshot, returns a suggested
   * replacement selector string.
   */
  suggestSelector(
    failedSelector: string,
    htmlSnapshot: string,
  ): Promise<string>;

  /** The name of the provider for logging purposes. */
  readonly providerName: string;
}

// ---------------------------------------------------------------------------
// MCP configuration
// ---------------------------------------------------------------------------

/** Capability flags for the Playwright MCP server. */
export type MCPToolCapability =
  | 'core'
  | 'core-input'
  | 'core-navigation'
  | 'core-tabs'
  | 'core-install'
  | 'vision'
  | 'pdf'
  | 'testing'
  | 'tracing';

/** Configuration for the Playwright MCP integration. */
export interface MCPConfig {
  /** Whether to enable MCP. Defaults to false. */
  enabled: boolean;
  /** Browser to launch. Defaults to 'chromium'. */
  browserName?: 'chromium' | 'firefox' | 'webkit';
  /** Run headless. Defaults to true. */
  headless?: boolean;
  /** Viewport size. */
  viewport?: { width: number; height: number };
  /** Which MCP tool capabilities to enable. */
  capabilities?: MCPToolCapability[];
  /** Whether to use accessibility snapshots instead of raw HTML for healing. */
  useSnapshotsForHealing?: boolean;
  /** Custom test ID attribute (e.g., "data-cy"). Defaults to "data-testid". */
  testIdAttribute?: string;
  /** Network origin filtering. */
  network?: {
    allowedOrigins?: string[];
    blockedOrigins?: string[];
  };
  /** Output directory for traces / session data. */
  outputDir?: string;
}

/** Default MCP configuration values. */
export const DEFAULT_MCP_CONFIG: Required<Omit<MCPConfig, 'network' | 'outputDir'>> & {
  network?: MCPConfig['network'];
  outputDir?: string;
} = {
  enabled: false,
  browserName: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 720 },
  capabilities: ['core', 'core-input', 'core-navigation', 'core-tabs'],
  useSnapshotsForHealing: true,
  testIdAttribute: 'data-testid',
};

/** Result returned by an MCP tool call. */
export interface MCPToolResult {
  /** The tool name that was called. */
  toolName: string;
  /** Whether the call succeeded. */
  success: boolean;
  /** Text content items from the response. */
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  /** Raw result object. */
  raw: unknown;
}

/**
 * Minimal subset of the Playwright Page interface used by the auditor.
 * This allows testing without importing Playwright directly.
 */
export interface PageLike {
  locator(selector: string): LocatorLike;
  content(): Promise<string>;
  url(): string;
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  evaluate<R>(pageFunction: string | ((...args: unknown[]) => R)): Promise<R>;
}

/**
 * Minimal subset of the Playwright Locator interface used by the auditor.
 */
export interface LocatorLike {
  click(options?: Record<string, unknown>): Promise<void>;
  fill(value: string, options?: Record<string, unknown>): Promise<void>;
  first(): LocatorLike;
  waitFor(options?: Record<string, unknown>): Promise<void>;
  textContent(options?: Record<string, unknown>): Promise<string | null>;
  innerText(options?: Record<string, unknown>): Promise<string>;
  inputValue(options?: Record<string, unknown>): Promise<string>;
  isVisible(options?: Record<string, unknown>): Promise<boolean>;
  count(): Promise<number>;
}
