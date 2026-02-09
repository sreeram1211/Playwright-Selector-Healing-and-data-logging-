/**
 * Accessibility scanner — wraps @axe-core/playwright to run a11y scans
 * and filters results to only critical/serious violations.
 */

import type { Page } from '@playwright/test';
import {
  A11yViolation,
  A11ySeverity,
  REPORTABLE_SEVERITIES,
} from './types';

/**
 * Run an accessibility scan on the given page and return only violations
 * at the reportable severity levels (critical, serious).
 *
 * @param page        The Playwright Page to scan.
 * @param action      A label for the action that triggered this scan.
 * @returns           Filtered list of violations.
 */
export async function runAccessibilityScan(
  page: Page,
  action: string,
): Promise<A11yViolation[]> {
  // Dynamic import so the module still loads even if axe-core is optional
  const { default: AxeBuilder } = await import('@axe-core/playwright');

  const results = await new AxeBuilder({ page }).analyze();

  const violations: A11yViolation[] = [];

  for (const v of results.violations) {
    const severity = v.impact as A11ySeverity | undefined;
    if (!severity || !REPORTABLE_SEVERITIES.has(severity)) continue;

    violations.push({
      ruleId: v.id,
      severity,
      description: v.description,
      affectedNodes: v.nodes.map((n) => n.target.join(' ')),
      url: page.url(),
      triggeringAction: action,
    });
  }

  return violations;
}
