/**
 * The Resilient Auditor — public API surface.
 */

// Core fixture and page
export { test, expect } from './fixture';
export { ResilientPage } from './resilient-page';
export { createAIHealingService } from './ai-healing-service';
export { runAccessibilityScan } from './accessibility-scanner';
export { buildReport, outputReport } from './reporter';

// MCP integration
export { MCPConnection } from './mcp-connection';
export { ResilientMCPPage } from './mcp-page';
export {
  test as mcpTest,
  expect as mcpExpect,
} from './mcp-fixture';

// Types
export type {
  A11ySeverity,
  A11yViolation,
  HealingEvent,
  TestReport,
  AIProviderConfig,
  ResilientAuditorConfig,
  AIHealingService,
  MCPConfig,
  MCPToolCapability,
  MCPToolResult,
} from './types';

export { REPORTABLE_SEVERITIES, DEFAULT_CONFIG, DEFAULT_MCP_CONFIG } from './types';
