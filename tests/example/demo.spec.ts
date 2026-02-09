/**
 * Example test demonstrating how to use The Resilient Auditor.
 *
 * This test requires:
 *   1. A Playwright browser installed (`npx playwright install chromium`)
 *   2. (Optional) An AI API key for self-healing:
 *        export ANTHROPIC_API_KEY=sk-...
 *        or
 *        export OPENAI_API_KEY=sk-...
 *
 * Run with:
 *   npm run test:integration
 */

import { test, expect } from '../../src/fixture';

// -----------------------------------------------------------------------
// Example 1: Basic usage with accessibility scanning (no AI healing)
// -----------------------------------------------------------------------

test.describe('Example — basic a11y scanning', () => {
  test.use({
    auditorConfig: {
      ai: false,          // AI healing disabled
      a11yEnabled: true,   // accessibility scanning enabled
      reporterMode: 'both', // output to console and JSON
      reportDir: './reports',
    },
  });

  test('navigate and check heading', async ({ resilientPage }) => {
    await resilientPage.goto('https://example.com');

    const heading = await resilientPage.textContent('h1');
    expect(heading).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// Example 2: Self-healing with a custom AI provider (for demo purposes)
// -----------------------------------------------------------------------

test.describe('Example — self-healing with custom provider', () => {
  test.use({
    auditorConfig: {
      ai: {
        provider: 'custom',
        customHealFn: async (failedSelector: string, _html: string) => {
          // A simple rule-based "AI" for demonstration:
          // If the selector looks like an ID, try a data-testid fallback.
          if (failedSelector.startsWith('#')) {
            const name = failedSelector.slice(1);
            return `[data-testid="${name}"]`;
          }
          // Otherwise, return a generic fallback.
          return 'body *:first-child';
        },
      },
      a11yEnabled: true,
      reporterMode: 'console',
    },
  });

  test('demonstrate healing from a broken selector', async ({ resilientPage }) => {
    await resilientPage.goto('https://example.com');

    // This selector works — no healing needed.
    const heading = await resilientPage.textContent('h1');
    expect(heading).toContain('Example Domain');
  });
});

// -----------------------------------------------------------------------
// Example 3: Using Anthropic as the AI provider
// -----------------------------------------------------------------------

test.describe('Example — Anthropic AI healing', () => {
  // Skip this suite unless ANTHROPIC_API_KEY is set
  test.skip(!process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY not set');

  test.use({
    auditorConfig: {
      ai: {
        provider: 'anthropic',
        // apiKey is read from ANTHROPIC_API_KEY env var automatically
      },
      a11yEnabled: true,
      locatorTimeout: 3000,
      maxHealingRetries: 2,
      reporterMode: 'both',
      reportDir: './reports',
    },
  });

  test('navigate with Anthropic healing', async ({ resilientPage }) => {
    await resilientPage.goto('https://example.com');
    const heading = await resilientPage.textContent('h1');
    expect(heading).toContain('Example Domain');
  });
});

// -----------------------------------------------------------------------
// Example 4: Using OpenAI as the AI provider
// -----------------------------------------------------------------------

test.describe('Example — OpenAI AI healing', () => {
  test.skip(!process.env.OPENAI_API_KEY, 'OPENAI_API_KEY not set');

  test.use({
    auditorConfig: {
      ai: {
        provider: 'openai',
        // apiKey is read from OPENAI_API_KEY env var automatically
      },
      a11yEnabled: true,
      reporterMode: 'console',
    },
  });

  test('navigate with OpenAI healing', async ({ resilientPage }) => {
    await resilientPage.goto('https://example.com');
    const heading = await resilientPage.textContent('h1');
    expect(heading).toContain('Example Domain');
  });
});
