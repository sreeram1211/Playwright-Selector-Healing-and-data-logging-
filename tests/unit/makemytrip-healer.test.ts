import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for the MakeMyTrip rule-based healer and selector map.
 * These run without a browser — they verify the healing logic itself.
 */

describe('MMT selector map', () => {
  it('exports the BASE_URL', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.equal(MMT.BASE_URL, 'https://www.makemytrip.com');
  });

  it('has multiple candidate selectors for fromCity', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.ok(MMT.flights.fromCity.length >= 2);
  });

  it('has multiple candidate selectors for searchBtn', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.ok(MMT.flights.searchBtn.length >= 3);
  });

  it('has candidate selectors for every nav tab', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.ok(MMT.nav.flights.length >= 1);
    assert.ok(MMT.nav.hotels.length >= 1);
    assert.ok(MMT.nav.trains.length >= 1);
    assert.ok(MMT.nav.buses.length >= 1);
    assert.ok(MMT.nav.cabs.length >= 1);
  });

  it('datePicker.day() returns selectors containing the day number', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    const daySels = MMT.flights.datePicker.day(15);
    assert.ok(daySels.length >= 1);
    assert.ok(daySels[0].includes('15'));
  });

  it('has hotel search selectors', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.ok(MMT.hotels.city.length >= 1);
    assert.ok(MMT.hotels.searchBtn.length >= 1);
    assert.ok(MMT.hotels.checkIn.length >= 1);
    assert.ok(MMT.hotels.checkOut.length >= 1);
  });

  it('has flight results selectors', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.ok(MMT.flightResults.resultsList.length >= 1);
    assert.ok(MMT.flightResults.firstResult.length >= 1);
    assert.ok(MMT.flightResults.price.length >= 1);
  });

  it('has login modal selectors', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    assert.ok(MMT.loginModal.closeBtn.length >= 2);
    assert.ok(MMT.loginModal.overlay.length >= 2);
  });
});

describe('MMT healer — createMMTHealerConfig', () => {
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalAnthropicKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (originalOpenAIKey !== undefined) {
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('returns a custom provider config', async () => {
    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();
    assert.equal(config.provider, 'custom');
    assert.ok(typeof config.customHealFn === 'function');
  });

  it('rule-based: heals #hp-widget__sfrom to #fromCity', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();

    // The HTML contains id="fromCity" — the healer should find it.
    const html = '<div><label for="fromCity" id="fromCity">From</label></div>';
    const result = await config.customHealFn!('#hp-widget__sfrom', html);

    // Should suggest something other than #hp-widget__sfrom.
    assert.notEqual(result, '#hp-widget__sfrom');
  });

  it('rule-based: heals #flights_submit to a known alternative', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();

    const html = '<a data-cy="submit" class="primaryBtn">Search</a>';
    const result = await config.customHealFn!('#flights_submit', html);

    assert.notEqual(result, '#flights_submit');
  });

  it('rule-based: heals overlay close button to alternative', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();

    const html = '<span class="commonModal__close">X</span>';
    const result = await config.customHealFn!(
      '.bgProperties.icon20.overlayCrossIcon',
      html,
    );

    assert.notEqual(result, '.bgProperties.icon20.overlayCrossIcon');
  });

  it('falls back to data-testid pattern for unknown ID selectors', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();

    // Unknown selector not in the map.
    const html = '<div>no matching ids</div>';
    const result = await config.customHealFn!('#unknownWidget123', html);

    // Should fall back to data-testid pattern.
    assert.equal(result, '[data-testid="unknownWidget123"]');
  });

  it('falls back to class wildcard for unknown class selectors', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();

    const html = '<div class="someRandomClass">text</div>';
    const result = await config.customHealFn!('.someRandomClass', html);

    assert.equal(result, '[class*="someRandomClass"]');
  });

  it('returns original selector for totally unknown patterns', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { createMMTHealerConfig } = await import('../e2e/makemytrip.healer.ts');
    const config = createMMTHealerConfig();

    const html = '<div>nothing here</div>';
    const result = await config.customHealFn!('xpath=//div[@id="x"]', html);

    // Non-ID, non-class — returns original.
    assert.equal(result, 'xpath=//div[@id="x"]');
  });
});

describe('MMT healer — rule-based healing consistency', () => {
  it('every nav selector has at least one fallback', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    const navCategories = [
      MMT.nav.flights,
      MMT.nav.hotels,
      MMT.nav.homestays,
      MMT.nav.trains,
      MMT.nav.buses,
      MMT.nav.cabs,
    ];
    for (const candidates of navCategories) {
      assert.ok(candidates.length >= 2, `Nav category has < 2 candidates: ${candidates}`);
    }
  });

  it('every flight form selector has at least one fallback', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    const flightFields = [
      MMT.flights.fromCity,
      MMT.flights.toCity,
      MMT.flights.departDate,
      MMT.flights.searchBtn,
    ];
    for (const candidates of flightFields) {
      assert.ok(candidates.length >= 2, `Flight field has < 2 candidates: ${candidates}`);
    }
  });

  it('every hotel form selector has at least one fallback', async () => {
    const { MMT } = await import('../e2e/makemytrip.selectors.ts');
    const hotelFields = [
      MMT.hotels.city,
      MMT.hotels.checkIn,
      MMT.hotels.checkOut,
      MMT.hotels.searchBtn,
    ];
    for (const candidates of hotelFields) {
      assert.ok(candidates.length >= 2, `Hotel field has < 2 candidates: ${candidates}`);
    }
  });
});
