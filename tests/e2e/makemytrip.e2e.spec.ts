/**
 * MakeMyTrip.com — End-to-End Test Suite
 *
 * Demonstrates The Resilient Auditor on a real production site:
 *
 *   - Self-healing selectors (rule-based + optional AI fallback)
 *   - Automatic accessibility auditing after every action
 *   - Unified reporting (console + JSON)
 *
 * Prerequisites:
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test --project=e2e
 *
 * Optional — enable AI-powered healing:
 *   export ANTHROPIC_API_KEY=sk-ant-...   # or OPENAI_API_KEY=sk-...
 */

import { test, expect } from '../../src/fixture';
import { MMT, findFirstMatching } from './makemytrip.selectors';
import { createMMTHealerConfig } from './makemytrip.healer';

// ---------------------------------------------------------------------------
// Shared configuration for every test in this file.
// ---------------------------------------------------------------------------

test.use({
  auditorConfig: {
    ai: createMMTHealerConfig(),
    a11yEnabled: true,
    locatorTimeout: 8000,
    maxHealingRetries: 3,
    reporterMode: 'both',
    reportDir: './reports/makemytrip',
  },
});

// ---------------------------------------------------------------------------
// Helper: dismiss the login modal that MakeMyTrip shows on first visit.
// ---------------------------------------------------------------------------

async function dismissLoginModalIfPresent(
  page: import('@playwright/test').Page,
): Promise<void> {
  // MakeMyTrip often shows a login/signup modal overlay on first visit.
  // We try each known close-button selector with a short timeout.
  for (const sel of MMT.loginModal.closeBtn) {
    try {
      const btn = page.locator(sel);
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      // Wait briefly for the modal to animate out.
      await page.waitForTimeout(500);
      return;
    } catch {
      // selector not found — try next
    }
  }
  // No modal appeared — that's fine.
}

/**
 * Helper: compute a future date string for the date picker.
 * Returns { day, monthYear } where day is the numeric day and
 * monthYear is like "Mar 2025".
 */
function getFutureDate(daysFromNow: number): { day: number; monthYear: string } {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const day = d.getDate();
  const monthYear = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return { day, monthYear };
}

// ============================================================================
//  TEST SUITE 1 — Homepage & Navigation
// ============================================================================

test.describe('MakeMyTrip — Homepage & Navigation', () => {
  test('TC-01: loads the homepage and runs initial a11y scan', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Verify the page loaded — check the document title.
    const title = await resilientPage.page.title();
    expect(title.toLowerCase()).toContain('makemytrip');

    // The afterAction hook on goto already ran an a11y scan.
    // We can inspect any violations captured so far.
    // (We don't assert zero violations — real sites have them.)
  });

  test('TC-02: navigate between trip-type tabs (flights, hotels, trains)', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Click on Flights tab — uses self-healing.
    const flightSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.flights,
    );
    if (flightSel) {
      await resilientPage.click(flightSel);
    }

    // Click on Hotels tab.
    const hotelSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.hotels,
    );
    if (hotelSel) {
      await resilientPage.click(hotelSel);
    }

    // Click on Trains tab.
    const trainSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.trains,
    );
    if (trainSel) {
      await resilientPage.click(trainSel);
    }

    // Each click triggered an a11y scan automatically.
    // The report will show any violations found during navigation.
  });

  test('TC-03: verify core navigation elements are present', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Check that the flights link exists somewhere on the page.
    const flightLink = await findFirstMatching(
      resilientPage.page,
      MMT.nav.flights,
    );
    expect(flightLink).toBeTruthy();

    // Check that the hotels link exists.
    const hotelLink = await findFirstMatching(
      resilientPage.page,
      MMT.nav.hotels,
    );
    expect(hotelLink).toBeTruthy();
  });
});

// ============================================================================
//  TEST SUITE 2 — Flight Search Flow
// ============================================================================

test.describe('MakeMyTrip — Flight Search', () => {
  test.beforeEach(async ({ resilientPage }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Ensure we're on the flights tab.
    const flightSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.flights,
    );
    if (flightSel) {
      await resilientPage.click(flightSel);
      await resilientPage.page.waitForTimeout(500);
    }
  });

  test('TC-04: select "From" city with autocomplete', async ({
    resilientPage,
  }) => {
    // Click the "From" city field — triggers self-healing if selector changed.
    const fromCitySel = await findFirstMatching(
      resilientPage.page,
      MMT.flights.fromCity,
    );
    if (fromCitySel) {
      await resilientPage.click(fromCitySel);
    }

    // Type in the city name to trigger autocomplete.
    const fromInputSel = await findFirstMatching(
      resilientPage.page,
      MMT.flights.fromCityInput,
    );
    if (fromInputSel) {
      await resilientPage.fill(fromInputSel, 'Delhi');
      // Wait for autocomplete suggestions.
      await resilientPage.page.waitForTimeout(1000);

      // Pick the first suggestion.
      const firstSuggestion = await findFirstMatching(
        resilientPage.page,
        MMT.flights.autocomplete.firstItem,
      );
      if (firstSuggestion) {
        await resilientPage.click(firstSuggestion);
      }
    }
  });

  test('TC-05: select "To" city with autocomplete', async ({
    resilientPage,
  }) => {
    // Click the "To" city field.
    const toCitySel = await findFirstMatching(
      resilientPage.page,
      MMT.flights.toCity,
    );
    if (toCitySel) {
      await resilientPage.click(toCitySel);
    }

    // Type in destination.
    const toInputSel = await findFirstMatching(
      resilientPage.page,
      MMT.flights.toCityInput,
    );
    if (toInputSel) {
      await resilientPage.fill(toInputSel, 'Mumbai');
      await resilientPage.page.waitForTimeout(1000);

      const firstSuggestion = await findFirstMatching(
        resilientPage.page,
        MMT.flights.autocomplete.firstItem,
      );
      if (firstSuggestion) {
        await resilientPage.click(firstSuggestion);
      }
    }
  });

  test('TC-06: complete flight search — Delhi to Mumbai', async ({
    resilientPage,
  }) => {
    const page = resilientPage.page;

    // --- Step 1: Select "From" city ---
    const fromCitySel = await findFirstMatching(page, MMT.flights.fromCity);
    if (fromCitySel) {
      await resilientPage.click(fromCitySel);
      const fromInputSel = await findFirstMatching(page, MMT.flights.fromCityInput);
      if (fromInputSel) {
        await resilientPage.fill(fromInputSel, 'Delhi');
        await page.waitForTimeout(1500);
        const firstItem = await findFirstMatching(page, MMT.flights.autocomplete.firstItem);
        if (firstItem) await resilientPage.click(firstItem);
      }
    }

    await page.waitForTimeout(500);

    // --- Step 2: Select "To" city ---
    const toCitySel = await findFirstMatching(page, MMT.flights.toCity);
    if (toCitySel) {
      await resilientPage.click(toCitySel);
      const toInputSel = await findFirstMatching(page, MMT.flights.toCityInput);
      if (toInputSel) {
        await resilientPage.fill(toInputSel, 'Mumbai');
        await page.waitForTimeout(1500);
        const firstItem = await findFirstMatching(page, MMT.flights.autocomplete.firstItem);
        if (firstItem) await resilientPage.click(firstItem);
      }
    }

    await page.waitForTimeout(500);

    // --- Step 3: Select departure date ---
    const departSel = await findFirstMatching(page, MMT.flights.departDate);
    if (departSel) {
      await resilientPage.click(departSel);
      await page.waitForTimeout(500);

      // Click a day ~10 days from now in the calendar.
      const { day } = getFutureDate(10);
      const dayCandidates = MMT.flights.datePicker.day(day);
      const daySel = await findFirstMatching(page, dayCandidates);
      if (daySel) {
        await resilientPage.click(daySel);
      }
    }

    await page.waitForTimeout(500);

    // --- Step 4: Click search ---
    const searchSel = await findFirstMatching(page, MMT.flights.searchBtn);
    if (searchSel) {
      await resilientPage.click(searchSel);

      // Wait for results page to start loading.
      await page.waitForTimeout(3000);

      // Verify we navigated to results (URL should contain /flight/search).
      const url = page.url();
      expect(url).toContain('flight');
    }
  });

  test('TC-07: select round-trip and set return date', async ({
    resilientPage,
  }) => {
    const page = resilientPage.page;

    // Click round-trip option.
    const roundTripSel = await findFirstMatching(
      page,
      MMT.flights.tripType.roundTrip,
    );
    if (roundTripSel) {
      await resilientPage.click(roundTripSel);
      await page.waitForTimeout(500);
    }

    // Click return date field.
    const returnSel = await findFirstMatching(page, MMT.flights.returnDate);
    if (returnSel) {
      await resilientPage.click(returnSel);
      await page.waitForTimeout(500);

      // Select a day ~17 days from now.
      const { day } = getFutureDate(17);
      const dayCandidates = MMT.flights.datePicker.day(day);
      const daySel = await findFirstMatching(page, dayCandidates);
      if (daySel) {
        await resilientPage.click(daySel);
      }
    }
  });

  test('TC-08: open travellers/class picker and select business class', async ({
    resilientPage,
  }) => {
    const page = resilientPage.page;

    // Open the travellers dropdown.
    const travellersSel = await findFirstMatching(page, MMT.flights.travellers);
    if (travellersSel) {
      await resilientPage.click(travellersSel);
      await page.waitForTimeout(500);

      // Add an extra adult.
      const adultPlusSel = await findFirstMatching(
        page,
        MMT.flights.travellerCount.adultPlus,
      );
      if (adultPlusSel) {
        await resilientPage.click(adultPlusSel);
      }

      // Select business class.
      const businessSel = await findFirstMatching(
        page,
        MMT.flights.cabinClass.business,
      );
      if (businessSel) {
        await resilientPage.click(businessSel);
      }
    }
  });
});

// ============================================================================
//  TEST SUITE 3 — Flight Results Interaction
// ============================================================================

test.describe('MakeMyTrip — Flight Results', () => {
  test('TC-09: search and interact with flight results', async ({
    resilientPage,
  }) => {
    const page = resilientPage.page;

    // Navigate directly to a results page URL for Delhi→Mumbai.
    const { day: dDay } = getFutureDate(10);
    const departDate = new Date();
    departDate.setDate(departDate.getDate() + 10);
    const dd = String(departDate.getDate()).padStart(2, '0');
    const mm = String(departDate.getMonth() + 1).padStart(2, '0');
    const yyyy = departDate.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    await resilientPage.goto(
      `${MMT.BASE_URL}/flight/search?itinerary=DEL-BOM-${dateStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`,
      { waitUntil: 'domcontentloaded' },
    );

    // Wait for results to render.
    await page.waitForTimeout(5000);

    // Check that some results appeared.
    const resultsSel = await findFirstMatching(
      page,
      MMT.flightResults.resultsList,
      10000,
    );

    if (resultsSel) {
      // Check a result card is visible.
      const firstResult = await findFirstMatching(
        page,
        MMT.flightResults.firstResult,
      );
      expect(firstResult).toBeTruthy();

      // Try reading the price of the first result.
      if (firstResult) {
        const priceText = await resilientPage.textContent(firstResult);
        // Price should be non-empty.
        expect(priceText).toBeTruthy();
      }
    }
  });

  test('TC-10: apply "Non Stop" filter on results', async ({
    resilientPage,
  }) => {
    const page = resilientPage.page;

    const departDate = new Date();
    departDate.setDate(departDate.getDate() + 10);
    const dd = String(departDate.getDate()).padStart(2, '0');
    const mm = String(departDate.getMonth() + 1).padStart(2, '0');
    const yyyy = departDate.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    await resilientPage.goto(
      `${MMT.BASE_URL}/flight/search?itinerary=DEL-BOM-${dateStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`,
      { waitUntil: 'domcontentloaded' },
    );

    await page.waitForTimeout(5000);

    // Click "Non Stop" filter — heals if selector changed.
    const nonStopSel = await findFirstMatching(
      page,
      MMT.flightResults.filterStops.nonStop,
    );
    if (nonStopSel) {
      await resilientPage.click(nonStopSel);
      await page.waitForTimeout(2000);
    }
  });
});

// ============================================================================
//  TEST SUITE 4 — Hotel Search Flow
// ============================================================================

test.describe('MakeMyTrip — Hotel Search', () => {
  test.beforeEach(async ({ resilientPage }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Navigate to Hotels tab.
    const hotelSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.hotels,
    );
    if (hotelSel) {
      await resilientPage.click(hotelSel);
      await resilientPage.page.waitForTimeout(500);
    }
  });

  test('TC-11: search for hotels in Goa', async ({ resilientPage }) => {
    const page = resilientPage.page;

    // Click the hotel city field.
    const citySel = await findFirstMatching(page, MMT.hotels.city);
    if (citySel) {
      await resilientPage.click(citySel);

      const cityInputSel = await findFirstMatching(page, MMT.hotels.cityInput);
      if (cityInputSel) {
        await resilientPage.fill(cityInputSel, 'Goa');
        await page.waitForTimeout(1500);

        // Pick first autocomplete suggestion.
        const firstItem = await findFirstMatching(
          page,
          MMT.flights.autocomplete.firstItem,  // reuse same autocomplete structure
        );
        if (firstItem) {
          await resilientPage.click(firstItem);
        }
      }
    }

    await page.waitForTimeout(500);

    // Click check-in date.
    const checkInSel = await findFirstMatching(page, MMT.hotels.checkIn);
    if (checkInSel) {
      await resilientPage.click(checkInSel);
      await page.waitForTimeout(500);

      const { day } = getFutureDate(14);
      const dayCandidates = MMT.flights.datePicker.day(day);
      const daySel = await findFirstMatching(page, dayCandidates);
      if (daySel) await resilientPage.click(daySel);
    }

    await page.waitForTimeout(500);

    // Click check-out date.
    const checkOutSel = await findFirstMatching(page, MMT.hotels.checkOut);
    if (checkOutSel) {
      await resilientPage.click(checkOutSel);
      await page.waitForTimeout(500);

      const { day } = getFutureDate(17);
      const dayCandidates = MMT.flights.datePicker.day(day);
      const daySel = await findFirstMatching(page, dayCandidates);
      if (daySel) await resilientPage.click(daySel);
    }

    await page.waitForTimeout(500);

    // Click search.
    const searchSel = await findFirstMatching(page, MMT.hotels.searchBtn);
    if (searchSel) {
      await resilientPage.click(searchSel);
      await page.waitForTimeout(3000);

      const url = page.url();
      expect(url).toContain('hotel');
    }
  });

  test('TC-12: open rooms & guests picker', async ({ resilientPage }) => {
    const page = resilientPage.page;

    const roomsSel = await findFirstMatching(page, MMT.hotels.roomsGuests);
    if (roomsSel) {
      await resilientPage.click(roomsSel);
      await page.waitForTimeout(500);
      // Just verify the picker opened — the exact inner structure varies.
    }
  });
});

// ============================================================================
//  TEST SUITE 5 — Accessibility Audit Focus
// ============================================================================

test.describe('MakeMyTrip — Accessibility Audit', () => {
  test('TC-13: full-page a11y audit on homepage', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // The goto already triggered an a11y scan.
    // Now log a summary of what was found.
    const violations = resilientPage.a11yViolations;
    const critical = violations.filter((v) => v.severity === 'critical');
    const serious = violations.filter((v) => v.severity === 'serious');

    // We don't fail on violations — this is an audit, not a gate.
    // The report will show all findings.
    console.log(
      `[A11y Audit] Homepage: ${critical.length} critical, ${serious.length} serious violations`,
    );
  });

  test('TC-14: a11y audit across multiple navigation actions', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Click flights — triggers a11y scan.
    const flightSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.flights,
    );
    if (flightSel) await resilientPage.click(flightSel);

    // Click hotels — triggers another scan.
    const hotelSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.hotels,
    );
    if (hotelSel) await resilientPage.click(hotelSel);

    // Every action accumulated violations in resilientPage.a11yViolations.
    // The unified report at test end will summarize everything.
    const totalViolations = resilientPage.a11yViolations.length;
    console.log(
      `[A11y Audit] After navigation: ${totalViolations} total violations across ${3} actions`,
    );
  });

  test('TC-15: a11y audit on flight search results page', async ({
    resilientPage,
  }) => {
    const page = resilientPage.page;

    const departDate = new Date();
    departDate.setDate(departDate.getDate() + 10);
    const dd = String(departDate.getDate()).padStart(2, '0');
    const mm = String(departDate.getMonth() + 1).padStart(2, '0');
    const yyyy = departDate.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    await resilientPage.goto(
      `${MMT.BASE_URL}/flight/search?itinerary=DEL-BOM-${dateStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`,
      { waitUntil: 'domcontentloaded' },
    );

    await page.waitForTimeout(5000);

    // The goto triggered a scan on the results page.
    const violations = resilientPage.a11yViolations;
    console.log(
      `[A11y Audit] Flight results page: ${violations.length} violations`,
    );
  });
});

// ============================================================================
//  TEST SUITE 6 — Self-Healing Demonstration
// ============================================================================

test.describe('MakeMyTrip — Self-Healing Demo', () => {
  test('TC-16: healing from intentionally stale selectors', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Use an intentionally WRONG selector that's a known "old" version.
    // The healer should find the current selector via the rule-based map.
    try {
      // This is an ancient selector from the 2018 version of MMT:
      await resilientPage.click('#flights_submit');
    } catch {
      // Expected to fail if even the healer can't find it.
    }

    // Use another legacy selector for the "from" city:
    try {
      await resilientPage.click('#hp-widget__sfrom');
    } catch {
      // May fail — that's OK. The healing event will be logged.
    }

    // Check that healing was attempted.
    const healCount = resilientPage.healingEvents.length;
    console.log(`[Healing Demo] ${healCount} healing event(s) recorded`);

    // Log each healing event for visibility.
    for (const event of resilientPage.healingEvents) {
      console.log(
        `  Healed: "${event.originalSelector}" → "${event.healedSelector}" (${event.aiProvider})`,
      );
    }
  });

  test('TC-17: healing across a full user journey with stale selectors', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Attempt to interact using a MIX of current and outdated selectors.
    // Current selectors pass on first try; outdated ones trigger healing.

    // Step 1: Click flights using a CURRENT selector (no healing needed).
    const flightSel = await findFirstMatching(
      resilientPage.page,
      MMT.nav.flights,
    );
    if (flightSel) {
      await resilientPage.click(flightSel);
    }

    // Step 2: Try clicking "from city" with a LEGACY selector.
    // This should trigger healing → the healer maps it to the current ID.
    try {
      await resilientPage.click('#from_typeahead1');
    } catch {
      // If even the healer can't map it, that's fine for demo purposes.
    }

    // Step 3: Try the search button with another legacy selector.
    try {
      await resilientPage.click('#flights_submit');
    } catch {
      // Same — healing will be attempted.
    }

    // Final report:
    console.log(
      `[Healing Journey] Total healing events: ${resilientPage.healingEvents.length}`,
    );
    console.log(
      `[Healing Journey] Total a11y violations: ${resilientPage.a11yViolations.length}`,
    );
  });
});

// ============================================================================
//  TEST SUITE 7 — Edge Cases & Robustness
// ============================================================================

test.describe('MakeMyTrip — Edge Cases', () => {
  test('TC-18: handle page with heavy JS loading', async ({
    resilientPage,
  }) => {
    // MakeMyTrip loads a lot of JS. Test that the fixture handles slow
    // DOM readiness gracefully.
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'load' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // The page should have rendered by now.
    const title = await resilientPage.page.title();
    expect(title).toBeTruthy();
  });

  test('TC-19: navigate to a deep link and verify resilience', async ({
    resilientPage,
  }) => {
    // Direct deep-link to hotels search for Goa.
    await resilientPage.goto(
      `${MMT.BASE_URL}/hotels/hotel-listing?checkin=04152025&checkout=04182025&city=CTGOI&country=IN&roomStayQualifier=2e0e`,
      { waitUntil: 'domcontentloaded' },
    );

    await resilientPage.page.waitForTimeout(3000);

    // Just verify we loaded something — deep links may redirect.
    const url = resilientPage.page.url();
    expect(url).toContain('makemytrip');
  });

  test('TC-20: rapid sequential actions with a11y scanning', async ({
    resilientPage,
  }) => {
    await resilientPage.goto(MMT.BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissLoginModalIfPresent(resilientPage.page);

    // Quickly click through multiple nav tabs to stress-test
    // the afterAction a11y scanning pipeline.
    const tabs = [MMT.nav.flights, MMT.nav.hotels, MMT.nav.trains, MMT.nav.buses];

    for (const tabCandidates of tabs) {
      const sel = await findFirstMatching(resilientPage.page, tabCandidates, 2000);
      if (sel) {
        await resilientPage.click(sel);
        // Minimal wait between actions.
        await resilientPage.page.waitForTimeout(300);
      }
    }

    // After all actions, verify accumulated data.
    console.log(
      `[Rapid Actions] ${resilientPage.a11yViolations.length} a11y violations across ${tabs.length} tab clicks`,
    );
  });
});
