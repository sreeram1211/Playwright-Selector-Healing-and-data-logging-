/**
 * Unified Reporter — outputs a summary of healing events and a11y violations
 * to the console and/or as a JSON file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestReport, HealingEvent, A11yViolation } from './types';

// ---------------------------------------------------------------------------
// Console formatting
// ---------------------------------------------------------------------------

function formatConsoleSummary(report: TestReport): string {
  const status = report.passed ? 'PASSED' : 'FAILED';
  const lines: string[] = [
    '',
    '='.repeat(60),
    `  Resilient Auditor — Test ${status}`,
    `  "${report.testName}"`,
    '='.repeat(60),
    '',
    `  Healing Events : ${report.healingCount}`,
    `  A11y Violations: ${report.a11yViolationCount} (critical + serious)`,
    `  Duration       : ${report.durationMs} ms`,
    '',
  ];

  if (report.healingEvents.length > 0) {
    lines.push('  --- Healing Events ---');
    for (const h of report.healingEvents) {
      lines.push(`  [${h.timestamp}] (${h.action})`);
      lines.push(`    Original : ${h.originalSelector}`);
      lines.push(`    Healed   : ${h.healedSelector}`);
      lines.push(`    Provider : ${h.aiProvider}`);
    }
    lines.push('');
  }

  if (report.a11yViolations.length > 0) {
    lines.push('  --- A11y Violations ---');
    for (const v of report.a11yViolations) {
      lines.push(
        `  [${v.severity.toUpperCase()}] ${v.ruleId} — ${v.description}`,
      );
      lines.push(`    Action : ${v.triggeringAction}`);
      lines.push(`    URL    : ${v.url}`);
      lines.push(`    Nodes  : ${v.affectedNodes.join(', ')}`);
    }
    lines.push('');
  }

  const oneLiner = `Test ${status} with ${report.healingCount} Healing Event${report.healingCount !== 1 ? 's' : ''} and ${report.a11yViolationCount} A11y Violation${report.a11yViolationCount !== 1 ? 's' : ''}.`;
  lines.push(`  Summary: ${oneLiner}`);
  lines.push('='.repeat(60));
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

function writeJsonReport(report: TestReport, dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const safeName = report.testName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(dir, `${safeName}_${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildReport(
  testName: string,
  passed: boolean,
  healingEvents: HealingEvent[],
  a11yViolations: A11yViolation[],
  durationMs: number,
): TestReport {
  return {
    testName,
    passed,
    healingCount: healingEvents.length,
    healingEvents,
    a11yViolationCount: a11yViolations.length,
    a11yViolations,
    durationMs,
  };
}

/**
 * Output the report according to the requested mode.
 *
 * @returns The formatted console string (always computed for testing),
 *          and optionally the JSON file path.
 */
export function outputReport(
  report: TestReport,
  mode: 'console' | 'json' | 'both',
  reportDir: string,
): { consoleOutput: string; jsonPath?: string } {
  const consoleOutput = formatConsoleSummary(report);
  let jsonPath: string | undefined;

  if (mode === 'console' || mode === 'both') {
    // eslint-disable-next-line no-console
    console.log(consoleOutput);
  }

  if (mode === 'json' || mode === 'both') {
    jsonPath = writeJsonReport(report, reportDir);
  }

  return { consoleOutput, jsonPath };
}
