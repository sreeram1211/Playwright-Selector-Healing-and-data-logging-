# The Resilient Auditor

AI-driven self-healing Playwright selectors with automated accessibility auditing.

## What It Does

**The Resilient Auditor** is a Playwright testing utility that combines two capabilities:

1. **Self-Healing Selectors** — When a CSS/Playwright selector fails (times out), the tool captures the current page HTML, sends it to an AI API (Anthropic or OpenAI), and retries the action with the AI-suggested replacement selector. Every healing event is logged.

2. **Automatic Accessibility Auditing** — After every `click`, `fill`, or `goto` action, an accessibility scan runs via `@axe-core/playwright`. Only `critical` and `serious` violations are reported, filtering out noise.

A unified reporter outputs a summary at the end of each test:

```
Test PASSED with 1 Healing Event and 2 A11y Violations.
```

## Project Structure

```
src/
  types.ts               # TypeScript interfaces and constants
  ai-healing-service.ts  # AI provider integration (Anthropic, OpenAI, custom)
  accessibility-scanner.ts # axe-core wrapper
  resilient-page.ts      # ResilientPage class (core logic)
  fixture.ts             # Playwright fixture definition
  reporter.ts            # Console + JSON reporter
  index.ts               # Public API re-exports
tests/
  unit/                  # Unit tests (Node test runner, no browser needed)
  example/               # Integration tests (require browser + optional API key)
```

## Setup

### Prerequisites

- Node.js >= 18
- npm

### Install

```bash
npm install
npx playwright install chromium   # or: npx playwright install
```

### Environment Variables

Set one of these if you want AI-powered selector healing:

| Variable             | Provider  | Example                      |
|----------------------|-----------|------------------------------|
| `ANTHROPIC_API_KEY`  | Anthropic | `sk-ant-api03-...`           |
| `OPENAI_API_KEY`     | OpenAI    | `sk-proj-...`                |

You can also pass the key directly in configuration (see below).

## Usage

### 1. Import the fixture

```typescript
import { test, expect } from './src/fixture';
```

### 2. Use `resilientPage` in tests

```typescript
test('example', async ({ resilientPage }) => {
  await resilientPage.goto('https://example.com');
  await resilientPage.click('#submit-button');
  await resilientPage.fill('#email', 'user@test.com');

  const heading = await resilientPage.textContent('h1');
  expect(heading).toBeTruthy();
});
```

### 3. Configure the auditor

Override settings per test file or describe block using `test.use()`:

```typescript
test.use({
  auditorConfig: {
    ai: {
      provider: 'anthropic',
      // apiKey: 'sk-...',          // or use ANTHROPIC_API_KEY env var
      // model: 'claude-sonnet-4-20250514',   // optional model override
    },
    a11yEnabled: true,              // run accessibility scans (default: true)
    locatorTimeout: 3000,           // ms before triggering healing (default: 5000)
    maxHealingRetries: 2,           // retry count (default: 1)
    reporterMode: 'both',          // 'console' | 'json' | 'both'
    reportDir: './reports',         // directory for JSON reports
  },
});
```

### Custom AI Provider

Supply your own healing logic without calling any external API:

```typescript
test.use({
  auditorConfig: {
    ai: {
      provider: 'custom',
      customHealFn: async (failedSelector, htmlSnapshot) => {
        // Your logic here — return a replacement selector string
        return `[data-testid="${failedSelector.replace('#', '')}"]`;
      },
    },
  },
});
```

### Disable AI healing

```typescript
test.use({
  auditorConfig: {
    ai: false,    // only accessibility scanning, no healing
  },
});
```

## Available Methods

The `resilientPage` fixture exposes these self-healing action methods:

| Method                              | Description                                     |
|-------------------------------------|-------------------------------------------------|
| `click(selector, options?)`         | Click with healing + a11y scan                  |
| `fill(selector, value, options?)`   | Fill input with healing + a11y scan             |
| `goto(url, options?)`               | Navigate + a11y scan                            |
| `textContent(selector, options?)`   | Get text with healing                           |
| `innerText(selector, options?)`     | Get inner text with healing                     |
| `inputValue(selector, options?)`    | Get input value with healing                    |
| `isVisible(selector)`              | Check visibility with healing                   |
| `locator(selector)`                | Raw Playwright locator (no healing)             |

Direct access to the underlying Playwright page is available via `resilientPage.page`.

## Running Tests

```bash
# Unit tests (no browser required)
npm test

# Integration tests (requires browser)
npm run test:integration

# Type checking only
npm run lint
```

## Reporter Output

### Console (default)

```
============================================================
  Resilient Auditor — Test PASSED
  "my test name"
============================================================

  Healing Events : 1
  A11y Violations: 2 (critical + serious)
  Duration       : 3456 ms

  --- Healing Events ---
  [2025-01-15T10:30:00.000Z] (click)
    Original : #old-button
    Healed   : button.submit-btn
    Provider : anthropic

  --- A11y Violations ---
  [CRITICAL] image-alt — Images must have alternate text
    Action : goto
    URL    : https://example.com
    Nodes  : img.hero

  Summary: Test PASSED with 1 Healing Event and 2 A11y Violations.
============================================================
```

### JSON

Reports are written to the configured `reportDir` as timestamped JSON files containing the full `TestReport` object.

## Architecture

- **`ResilientPage`** wraps a Playwright `Page`. Every action method first attempts the original selector. On timeout, it delegates to the `AIHealingService` to suggest a replacement, retries, and logs.
- **`AIHealingService`** is a pluggable interface. Implementations exist for Anthropic, OpenAI, and a custom function.
- **Accessibility scanning** uses `@axe-core/playwright`. Scans are automatically triggered after actions and filtered to `critical` + `serious` severity.
- **The reporter** aggregates all healing events and a11y violations, then outputs a summary in the configured format.

## License

GPL-3.0
