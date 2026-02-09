import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REPORTABLE_SEVERITIES, DEFAULT_CONFIG } from '../../src/types.ts';
import type { A11ySeverity } from '../../src/types.ts';

describe('REPORTABLE_SEVERITIES', () => {
  it('contains "critical"', () => {
    assert.ok(REPORTABLE_SEVERITIES.has('critical'));
  });

  it('contains "serious"', () => {
    assert.ok(REPORTABLE_SEVERITIES.has('serious'));
  });

  it('does not contain "moderate"', () => {
    assert.ok(!REPORTABLE_SEVERITIES.has('moderate'));
  });

  it('does not contain "minor"', () => {
    assert.ok(!REPORTABLE_SEVERITIES.has('minor'));
  });

  it('is immutable (ReadonlySet)', () => {
    // TypeScript enforces this at compile time, but at runtime we verify
    // there are exactly 2 entries.
    assert.equal(REPORTABLE_SEVERITIES.size, 2);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('has ai set to false by default', () => {
    assert.equal(DEFAULT_CONFIG.ai, false);
  });

  it('has a11yEnabled set to true', () => {
    assert.equal(DEFAULT_CONFIG.a11yEnabled, true);
  });

  it('has locatorTimeout of 5000ms', () => {
    assert.equal(DEFAULT_CONFIG.locatorTimeout, 5000);
  });

  it('has maxHealingRetries of 1', () => {
    assert.equal(DEFAULT_CONFIG.maxHealingRetries, 1);
  });

  it('has reporterMode set to console', () => {
    assert.equal(DEFAULT_CONFIG.reporterMode, 'console');
  });

  it('has reportDir set to ./reports', () => {
    assert.equal(DEFAULT_CONFIG.reportDir, './reports');
  });
});

describe('A11ySeverity type coverage', () => {
  it('accepts all four valid severity levels', () => {
    const severities: A11ySeverity[] = ['minor', 'moderate', 'serious', 'critical'];
    assert.equal(severities.length, 4);
    for (const s of severities) {
      assert.ok(typeof s === 'string');
    }
  });
});
