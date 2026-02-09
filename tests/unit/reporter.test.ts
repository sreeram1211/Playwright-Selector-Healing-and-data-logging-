import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { buildReport, outputReport } from '../../src/reporter.ts';
import type { HealingEvent, A11yViolation, TestReport } from '../../src/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHealingEvent(overrides: Partial<HealingEvent> = {}): HealingEvent {
  return {
    originalSelector: '#old',
    healedSelector: '#new',
    action: 'click',
    timestamp: '2025-01-01T00:00:00.000Z',
    aiProvider: 'custom',
    ...overrides,
  };
}

function makeViolation(overrides: Partial<A11yViolation> = {}): A11yViolation {
  return {
    ruleId: 'color-contrast',
    severity: 'serious',
    description: 'Elements must have sufficient color contrast',
    affectedNodes: ['#header'],
    url: 'https://example.com',
    triggeringAction: 'goto',
    ...overrides,
  };
}

// Clean up temp dirs after tests
const tempDirs: string[] = [];
afterEach(() => {
  for (const d of tempDirs) {
    fs.rmSync(d, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

function makeTempDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'resilient-test-'));
  tempDirs.push(d);
  return d;
}

// ---------------------------------------------------------------------------
// buildReport
// ---------------------------------------------------------------------------

describe('buildReport', () => {
  it('creates a report with correct counts', () => {
    const events = [makeHealingEvent(), makeHealingEvent()];
    const violations = [makeViolation()];
    const report = buildReport('my test', true, events, violations, 1234);

    assert.equal(report.testName, 'my test');
    assert.equal(report.passed, true);
    assert.equal(report.healingCount, 2);
    assert.equal(report.a11yViolationCount, 1);
    assert.equal(report.durationMs, 1234);
    assert.deepEqual(report.healingEvents, events);
    assert.deepEqual(report.a11yViolations, violations);
  });

  it('handles empty events/violations', () => {
    const report = buildReport('empty', true, [], [], 0);
    assert.equal(report.healingCount, 0);
    assert.equal(report.a11yViolationCount, 0);
  });

  it('records failed status', () => {
    const report = buildReport('fail test', false, [], [], 500);
    assert.equal(report.passed, false);
  });
});

// ---------------------------------------------------------------------------
// outputReport — console mode
// ---------------------------------------------------------------------------

describe('outputReport — console mode', () => {
  it('includes PASSED status and summary line', () => {
    const report = buildReport('pass test', true, [], [], 100);
    const { consoleOutput, jsonPath } = outputReport(report, 'console', '/dev/null');

    assert.ok(consoleOutput.includes('PASSED'));
    assert.ok(consoleOutput.includes('pass test'));
    assert.ok(consoleOutput.includes('0 Healing Events'));
    assert.ok(consoleOutput.includes('0 A11y Violations'));
    assert.equal(jsonPath, undefined);
  });

  it('includes FAILED status', () => {
    const report = buildReport('fail test', false, [], [], 100);
    const { consoleOutput } = outputReport(report, 'console', '/dev/null');
    assert.ok(consoleOutput.includes('FAILED'));
  });

  it('shows healing event details', () => {
    const events = [
      makeHealingEvent({
        originalSelector: '#submit-btn',
        healedSelector: 'button[type="submit"]',
        aiProvider: 'anthropic',
      }),
    ];
    const report = buildReport('heal test', true, events, [], 200);
    const { consoleOutput } = outputReport(report, 'console', '/dev/null');

    assert.ok(consoleOutput.includes('#submit-btn'));
    assert.ok(consoleOutput.includes('button[type="submit"]'));
    assert.ok(consoleOutput.includes('anthropic'));
    assert.ok(consoleOutput.includes('1 Healing Event'));
    // singular "Event" not "Events"
    assert.ok(!consoleOutput.includes('1 Healing Events'));
  });

  it('shows violation details', () => {
    const violations = [
      makeViolation({ ruleId: 'image-alt', severity: 'critical' }),
    ];
    const report = buildReport('a11y test', true, [], violations, 300);
    const { consoleOutput } = outputReport(report, 'console', '/dev/null');

    assert.ok(consoleOutput.includes('image-alt'));
    assert.ok(consoleOutput.includes('CRITICAL'));
    assert.ok(consoleOutput.includes('1 A11y Violation'));
    // singular
    assert.ok(!consoleOutput.includes('1 A11y Violations'));
  });

  it('pluralizes correctly for multiple events', () => {
    const events = [makeHealingEvent(), makeHealingEvent(), makeHealingEvent()];
    const violations = [makeViolation(), makeViolation()];
    const report = buildReport('plural', true, events, violations, 100);
    const { consoleOutput } = outputReport(report, 'console', '/dev/null');

    assert.ok(consoleOutput.includes('3 Healing Events'));
    assert.ok(consoleOutput.includes('2 A11y Violations'));
  });

  it('shows duration in summary', () => {
    const report = buildReport('time test', true, [], [], 9876);
    const { consoleOutput } = outputReport(report, 'console', '/dev/null');
    assert.ok(consoleOutput.includes('9876'));
  });
});

// ---------------------------------------------------------------------------
// outputReport — JSON mode
// ---------------------------------------------------------------------------

describe('outputReport — json mode', () => {
  it('writes a valid JSON file to the report directory', () => {
    const dir = makeTempDir();
    const report = buildReport('json test', true, [makeHealingEvent()], [makeViolation()], 500);
    const { jsonPath } = outputReport(report, 'json', dir);

    assert.ok(jsonPath);
    assert.ok(fs.existsSync(jsonPath));

    const written: TestReport = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    assert.equal(written.testName, 'json test');
    assert.equal(written.healingCount, 1);
    assert.equal(written.a11yViolationCount, 1);
    assert.equal(written.durationMs, 500);
    assert.equal(written.passed, true);
  });

  it('creates the output directory if it does not exist', () => {
    const dir = path.join(makeTempDir(), 'nested', 'reports');
    assert.ok(!fs.existsSync(dir));

    const report = buildReport('mkdir test', true, [], [], 0);
    const { jsonPath } = outputReport(report, 'json', dir);

    assert.ok(jsonPath);
    assert.ok(fs.existsSync(dir));
  });

  it('sanitizes test name for file path', () => {
    const dir = makeTempDir();
    const report = buildReport('test/with special<chars>', true, [], [], 0);
    const { jsonPath } = outputReport(report, 'json', dir);

    assert.ok(jsonPath);
    // File name should not contain / < >
    const basename = path.basename(jsonPath);
    assert.ok(!basename.includes('/'));
    assert.ok(!basename.includes('<'));
    assert.ok(!basename.includes('>'));
  });
});

// ---------------------------------------------------------------------------
// outputReport — both mode
// ---------------------------------------------------------------------------

describe('outputReport — both mode', () => {
  it('produces both console output and JSON file', () => {
    const dir = makeTempDir();
    const report = buildReport('both test', true, [], [], 100);
    const { consoleOutput, jsonPath } = outputReport(report, 'both', dir);

    assert.ok(consoleOutput.includes('PASSED'));
    assert.ok(jsonPath);
    assert.ok(fs.existsSync(jsonPath));
  });
});
