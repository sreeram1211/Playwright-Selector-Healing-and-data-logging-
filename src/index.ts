/**
 * The Resilient Auditor — public API surface.
 */

export { test, expect } from './fixture';
export { ResilientPage } from './resilient-page';
export { createAIHealingService } from './ai-healing-service';
export { runAccessibilityScan } from './accessibility-scanner';
export { buildReport, outputReport } from './reporter';

export type {
  A11ySeverity,
  A11yViolation,
  HealingEvent,
  TestReport,
  AIProviderConfig,
  ResilientAuditorConfig,
  AIHealingService,
} from './types';

export { REPORTABLE_SEVERITIES, DEFAULT_CONFIG } from './types';
