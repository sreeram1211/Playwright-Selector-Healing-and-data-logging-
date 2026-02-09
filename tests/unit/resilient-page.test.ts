import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * We test ResilientPage by mocking the Playwright Page and Locator objects.
 * This lets us exercise the self-healing logic, afterAction hooks, and
 * edge cases without needing a real browser.
 */

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface MockLocator {
  click: ReturnType<typeof mock.fn>;
  fill: ReturnType<typeof mock.fn>;
  first: ReturnType<typeof mock.fn>;
  waitFor: ReturnType<typeof mock.fn>;
  textContent: ReturnType<typeof mock.fn>;
  innerText: ReturnType<typeof mock.fn>;
  inputValue: ReturnType<typeof mock.fn>;
  isVisible: ReturnType<typeof mock.fn>;
  count: ReturnType<typeof mock.fn>;
}

function createMockLocator(overrides: Partial<Record<keyof MockLocator, unknown>> = {}): MockLocator {
  const loc: MockLocator = {
    click: mock.fn(async () => {}),
    fill: mock.fn(async () => {}),
    first: mock.fn(() => loc),
    waitFor: mock.fn(async () => {}),
    textContent: mock.fn(async () => 'text'),
    innerText: mock.fn(async () => 'inner'),
    inputValue: mock.fn(async () => 'value'),
    isVisible: mock.fn(async () => true),
    count: mock.fn(async () => 1),
  };
  for (const [k, v] of Object.entries(overrides)) {
    (loc as Record<string, unknown>)[k] = v;
  }
  return loc;
}

interface MockPage {
  locator: ReturnType<typeof mock.fn>;
  content: ReturnType<typeof mock.fn>;
  url: ReturnType<typeof mock.fn>;
  goto: ReturnType<typeof mock.fn>;
  evaluate: ReturnType<typeof mock.fn>;
}

function createMockPage(locatorMap?: Record<string, MockLocator>): MockPage {
  const defaultLocator = createMockLocator();
  return {
    locator: mock.fn((selector: string) => {
      if (locatorMap && locatorMap[selector]) return locatorMap[selector];
      return defaultLocator;
    }),
    content: mock.fn(async () => '<html><body><button id="btn">Click</button></body></html>'),
    url: mock.fn(() => 'https://example.com'),
    goto: mock.fn(async () => {}),
    evaluate: mock.fn(async () => {}),
  };
}

// ---------------------------------------------------------------------------
// Dynamic import of ResilientPage (to avoid issues with module caching)
// ---------------------------------------------------------------------------

async function importResilientPage() {
  // We need to mock the accessibility scanner so it doesn't try to
  // import @axe-core/playwright during unit tests.
  // The simplest approach: construct ResilientPage with a11y disabled.
  const mod = await import('../../src/resilient-page.ts');
  return mod.ResilientPage;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResilientPage — constructor', () => {
  it('creates with default config (no AI, a11y enabled)', async () => {
    const ResilientPage = await importResilientPage();
    const page = createMockPage();
    const rp = new ResilientPage(page as any, {});

    assert.deepEqual(rp.healingEvents, []);
    assert.deepEqual(rp.a11yViolations, []);
    assert.equal(rp.page, page);
  });

  it('accepts custom AI config', async () => {
    const ResilientPage = await importResilientPage();
    const page = createMockPage();
    // Should not throw when providing valid custom AI config
    const rp = new ResilientPage(page as any, {
      ai: {
        provider: 'custom',
        customHealFn: async () => '#x',
      },
    });
    assert.ok(rp);
  });
});

describe('ResilientPage — click', () => {
  it('clicks successfully on first attempt (no healing needed)', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator();
    const page = createMockPage({ '#btn': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.click('#btn');

    assert.equal(locator.waitFor.mock.callCount(), 1);
    assert.equal(locator.click.mock.callCount(), 1);
    assert.equal(rp.healingEvents.length, 0);
  });

  it('passes options to the locator click call', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator();
    const page = createMockPage({ '#btn': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.click('#btn', { force: true });

    const args = locator.click.mock.calls[0].arguments;
    assert.deepEqual(args[0], { force: true });
  });
});

describe('ResilientPage — fill', () => {
  it('fills successfully on first attempt', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator();
    const page = createMockPage({ '#input': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.fill('#input', 'hello');

    assert.equal(locator.fill.mock.callCount(), 1);
    assert.equal(locator.fill.mock.calls[0].arguments[0], 'hello');
    assert.equal(rp.healingEvents.length, 0);
  });
});

describe('ResilientPage — textContent', () => {
  it('returns text content from the locator', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator({
      textContent: mock.fn(async () => 'Hello World'),
    });
    const page = createMockPage({ '#el': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    const text = await rp.textContent('#el');
    assert.equal(text, 'Hello World');
  });
});

describe('ResilientPage — innerText', () => {
  it('returns inner text from the locator', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator({
      innerText: mock.fn(async () => 'Inner'),
    });
    const page = createMockPage({ '#el': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    const text = await rp.innerText('#el');
    assert.equal(text, 'Inner');
  });
});

describe('ResilientPage — inputValue', () => {
  it('returns input value from the locator', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator({
      inputValue: mock.fn(async () => 'val123'),
    });
    const page = createMockPage({ '#field': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    const val = await rp.inputValue('#field');
    assert.equal(val, 'val123');
  });
});

describe('ResilientPage — isVisible', () => {
  it('returns visibility from the locator', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator({
      isVisible: mock.fn(async () => false),
    });
    const page = createMockPage({ '#hidden': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    const visible = await rp.isVisible('#hidden');
    assert.equal(visible, false);
  });
});

describe('ResilientPage — goto', () => {
  it('calls page.goto with the URL', async () => {
    const ResilientPage = await importResilientPage();
    const page = createMockPage();

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.goto('https://example.com');

    assert.equal(page.goto.mock.callCount(), 1);
    assert.equal(page.goto.mock.calls[0].arguments[0], 'https://example.com');
  });

  it('passes options to page.goto', async () => {
    const ResilientPage = await importResilientPage();
    const page = createMockPage();

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.goto('https://example.com', { waitUntil: 'networkidle' });

    const args = page.goto.mock.calls[0].arguments;
    assert.deepEqual(args[1], { waitUntil: 'networkidle' });
  });
});

describe('ResilientPage — locator', () => {
  it('returns the raw Playwright locator (no healing)', async () => {
    const ResilientPage = await importResilientPage();
    const mockLoc = createMockLocator();
    const page = createMockPage({ '#raw': mockLoc });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    const loc = rp.locator('#raw');
    assert.equal(loc, mockLoc);
  });
});

describe('ResilientPage — self-healing', () => {
  it('heals when original selector fails and AI provides a fix', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const healedLocator = createMockLocator();

    const page = createMockPage({
      '#broken': failingLocator,
      '#fixed': healedLocator,
    });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => '#fixed',
      },
      locatorTimeout: 100,
    });

    await rp.click('#broken');

    // Should have healed
    assert.equal(rp.healingEvents.length, 1);
    assert.equal(rp.healingEvents[0].originalSelector, '#broken');
    assert.equal(rp.healingEvents[0].healedSelector, '#fixed');
    assert.equal(rp.healingEvents[0].action, 'click');
    assert.equal(rp.healingEvents[0].aiProvider, 'custom');

    // The healed locator should have been clicked
    assert.equal(healedLocator.click.mock.callCount(), 1);
  });

  it('heals fill actions too', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const healedLocator = createMockLocator();

    const page = createMockPage({
      '#old-input': failingLocator,
      '#new-input': healedLocator,
    });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => '#new-input',
      },
      locatorTimeout: 100,
    });

    await rp.fill('#old-input', 'test value');

    assert.equal(rp.healingEvents.length, 1);
    assert.equal(rp.healingEvents[0].action, 'fill');
    assert.equal(healedLocator.fill.mock.callCount(), 1);
    assert.equal(healedLocator.fill.mock.calls[0].arguments[0], 'test value');
  });

  it('throws when healing is disabled and selector fails', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });

    const page = createMockPage({ '#missing': failingLocator });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: false,
      locatorTimeout: 100,
    });

    await assert.rejects(
      () => rp.click('#missing'),
      /AI healing is disabled/,
    );
  });

  it('throws when AI suggestion also fails (exhausted retries)', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const alsoFailingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Still broken'); }),
    });

    const page = createMockPage({
      '#broken': failingLocator,
      '#still-broken': alsoFailingLocator,
    });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => '#still-broken',
      },
      locatorTimeout: 100,
      maxHealingRetries: 1,
    });

    await assert.rejects(
      () => rp.click('#broken'),
      /could not be healed/,
    );
    assert.equal(rp.healingEvents.length, 0);
  });

  it('records the page HTML content when healing', async () => {
    const ResilientPage = await importResilientPage();

    let capturedHtml = '';
    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const healedLocator = createMockLocator();

    const page = createMockPage({
      '#old': failingLocator,
      '#new': healedLocator,
    });
    page.content = mock.fn(async () => '<html><body>snapshot</body></html>');

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async (_sel, html) => {
          capturedHtml = html;
          return '#new';
        },
      },
      locatorTimeout: 100,
    });

    await rp.click('#old');
    assert.ok(capturedHtml.includes('snapshot'));
  });

  it('supports multiple retries', async () => {
    const ResilientPage = await importResilientPage();

    let callCount = 0;
    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const secondFailing = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout 2'); }),
    });
    const healedLocator = createMockLocator();

    const page = createMockPage({
      '#original': failingLocator,
      '#attempt1': secondFailing,
      '#attempt2': healedLocator,
    });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => {
          callCount++;
          return callCount === 1 ? '#attempt1' : '#attempt2';
        },
      },
      locatorTimeout: 100,
      maxHealingRetries: 2,
    });

    await rp.click('#original');
    assert.equal(rp.healingEvents.length, 1);
    assert.equal(rp.healingEvents[0].healedSelector, '#attempt2');
    assert.equal(callCount, 2);
  });

  it('records multiple healing events across different actions', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const healedLocator = createMockLocator();

    const page = createMockPage({
      '#btn1': failingLocator,
      '#btn2': failingLocator,
      '#healed1': healedLocator,
      '#healed2': healedLocator,
    });

    let healCount = 0;
    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => {
          healCount++;
          return healCount === 1 ? '#healed1' : '#healed2';
        },
      },
      locatorTimeout: 100,
    });

    await rp.click('#btn1');
    await rp.click('#btn2');

    assert.equal(rp.healingEvents.length, 2);
    assert.equal(rp.healingEvents[0].originalSelector, '#btn1');
    assert.equal(rp.healingEvents[1].originalSelector, '#btn2');
  });
});

describe('ResilientPage — healing for read actions', () => {
  it('heals textContent when selector fails', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const healedLocator = createMockLocator({
      textContent: mock.fn(async () => 'Healed text'),
    });

    const page = createMockPage({
      '#broken': failingLocator,
      '#fixed': healedLocator,
    });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => '#fixed',
      },
      locatorTimeout: 100,
    });

    const text = await rp.textContent('#broken');
    assert.equal(text, 'Healed text');
    assert.equal(rp.healingEvents.length, 1);
    assert.equal(rp.healingEvents[0].action, 'textContent');
  });

  it('heals isVisible when selector fails', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });
    const healedLocator = createMockLocator({
      isVisible: mock.fn(async () => true),
    });

    const page = createMockPage({
      '#broken': failingLocator,
      '#fixed': healedLocator,
    });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => '#fixed',
      },
      locatorTimeout: 100,
    });

    const visible = await rp.isVisible('#broken');
    assert.equal(visible, true);
    assert.equal(rp.healingEvents.length, 1);
  });
});

describe('ResilientPage — edge cases', () => {
  it('handles selector that is empty string', async () => {
    const ResilientPage = await importResilientPage();
    const page = createMockPage();

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    // Empty selector should still pass through to Playwright
    await rp.click('');
    assert.equal(page.locator.mock.callCount(), 1);
    assert.equal(page.locator.mock.calls[0].arguments[0], '');
  });

  it('handles AI provider that throws during healing', async () => {
    const ResilientPage = await importResilientPage();

    const failingLocator = createMockLocator({
      waitFor: mock.fn(async () => { throw new Error('Timeout'); }),
    });

    const page = createMockPage({ '#broken': failingLocator });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      ai: {
        provider: 'custom',
        customHealFn: async () => { throw new Error('AI is down'); },
      },
      locatorTimeout: 100,
    });

    await assert.rejects(
      () => rp.click('#broken'),
      /AI is down/,
    );
  });

  it('does not run a11y scan when a11yEnabled is false', async () => {
    const ResilientPage = await importResilientPage();
    const page = createMockPage();

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.click('#btn');
    await rp.goto('https://example.com');

    assert.equal(rp.a11yViolations.length, 0);
  });

  it('default locatorTimeout is 5000ms', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator();
    const page = createMockPage({ '#btn': locator });

    const rp = new ResilientPage(page as any, { a11yEnabled: false });
    await rp.click('#btn');

    const waitForArgs = locator.waitFor.mock.calls[0].arguments[0];
    assert.equal(waitForArgs.timeout, 5000);
  });

  it('custom locatorTimeout is passed to waitFor', async () => {
    const ResilientPage = await importResilientPage();
    const locator = createMockLocator();
    const page = createMockPage({ '#btn': locator });

    const rp = new ResilientPage(page as any, {
      a11yEnabled: false,
      locatorTimeout: 2000,
    });
    await rp.click('#btn');

    const waitForArgs = locator.waitFor.mock.calls[0].arguments[0];
    assert.equal(waitForArgs.timeout, 2000);
  });
});
