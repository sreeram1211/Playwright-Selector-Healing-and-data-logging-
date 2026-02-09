/**
 * MakeMyTrip.com — Known selectors and fallback maps.
 *
 * MakeMyTrip is a React SPA whose DOM structure changes across releases.
 * This file documents multiple generations of selectors for each element.
 * The Resilient Auditor's self-healing will kick in when any of these go
 * stale, but having known fallbacks here also lets us build a fast
 * rule-based custom healer that doesn't need an AI API call for common
 * renames.
 *
 * Each entry maps a logical element name → array of candidate selectors
 * ordered from most-recent → oldest known.
 */

export const MMT = {
  /** The base URL. */
  BASE_URL: 'https://www.makemytrip.com',

  // ---------------------------------------------------------------------------
  // Login / popup overlay that appears on first visit
  // ---------------------------------------------------------------------------
  loginModal: {
    overlay: [
      '.modal-dialog',
      '#login-modal',
      '.loginModal',
      '[data-cy="loginModal"]',
    ],
    closeBtn: [
      '.bgProperties.icon20.overlayCrossIcon',
      'span.commonModal__close',
      '.modal-header .close',
      '[data-cy="closeModal"]',
    ],
  },

  // ---------------------------------------------------------------------------
  // Top navigation — trip type tabs
  // ---------------------------------------------------------------------------
  nav: {
    flights: [
      'a[href*="flight"]',
      'li.menu_Flights a',
      '[data-cy="flights"]',
      'a[title="Flights"]',
    ],
    hotels: [
      'a[href*="hotel"]',
      'li.menu_Hotels a',
      '[data-cy="hotels"]',
      'a[title="Hotels"]',
    ],
    homestays: [
      'a[href*="homestays"]',
      'li.menu_Homestays a',
      '[data-cy="homestays"]',
    ],
    trains: [
      'a[href*="railways"]',
      'li.menu_Trains a',
      '[data-cy="trains"]',
    ],
    buses: [
      'a[href*="bus"]',
      'li.menu_Buses a',
      '[data-cy="buses"]',
    ],
    cabs: [
      'a[href*="cab"]',
      'li.menu_Cabs a',
      '[data-cy="cabs"]',
    ],
  },

  // ---------------------------------------------------------------------------
  // Flight search form
  // ---------------------------------------------------------------------------
  flights: {
    tripType: {
      oneWay: [
        'li[data-cy="oneWayTrip"]',
        'label[for="oneWay"]',
        'li.oneway',
      ],
      roundTrip: [
        'li[data-cy="roundTrip"]',
        'label[for="roundTrip"]',
        'li.return',
      ],
    },
    fromCity: [
      '#fromCity',
      'label[for="fromCity"]',
      'input#fromCity',
      '#hp-widget__sfrom',
      '[data-cy="fromCity"]',
    ],
    fromCityInput: [
      'input[placeholder="From"]',
      'input.react-autosuggest__input',
      '#fromCity_typeahead',
    ],
    toCity: [
      '#toCity',
      'label[for="toCity"]',
      'input#toCity',
      '#hp-widget__sto',
      '[data-cy="toCity"]',
    ],
    toCityInput: [
      'input[placeholder="To"]',
      'input.react-autosuggest__input',
      '#toCity_typeahead',
    ],
    autocomplete: {
      list: [
        'ul.react-autosuggest__suggestions-list',
        '.hsw_autocomplepopup',
        '.autoSuggestPlugin ul',
      ],
      firstItem: [
        'ul.react-autosuggest__suggestions-list li:first-child',
        'li[role="option"]:first-child',
        '.autoSuggestPlugin li:first-child',
      ],
    },
    departDate: [
      'span[data-cy="departureDate"]',
      '#departure',
      '.dateInner.departDate',
      '#start_date_sec',
      '[data-cy="departure"]',
    ],
    returnDate: [
      'span[data-cy="returnDate"]',
      '#return',
      '.dateInner.returnDate',
      '#return_date_sec',
      'input[id="hp-widget__return"]',
      '[data-cy="return"]',
    ],
    datePicker: {
      day: (dayNum: number) => [
        `.DayPicker-Day[aria-label*="${dayNum}"]`,
        `.dateInner p:has-text("${dayNum}")`,
      ],
      nextMonth: [
        '.DayPicker-NavButton--next',
        'span.DayPicker-NavButton--next',
        '[aria-label="Next Month"]',
      ],
      prevMonth: [
        '.DayPicker-NavButton--prev',
        'span.DayPicker-NavButton--prev',
        '[aria-label="Previous Month"]',
      ],
    },
    travellers: [
      '#travellers',
      '[data-cy="travellers"]',
      '.paxCounter',
      '#hp-widget__paxCounter_pot',
    ],
    travellerCount: {
      adultPlus: [
        'div[data-cy="adults"] span[data-cy="addAdult"]',
        '.adultCounter .plus',
        '.paxCounter__adult .paxCounter__plus',
      ],
      adultMinus: [
        'div[data-cy="adults"] span[data-cy="removeAdult"]',
        '.adultCounter .minus',
        '.paxCounter__adult .paxCounter__minus',
      ],
      childPlus: [
        'div[data-cy="children"] span[data-cy="addChild"]',
        '.childCounter .plus',
        '.paxCounter__child .paxCounter__plus',
      ],
    },
    cabinClass: {
      economy: [
        'li[data-cy="economy"]',
        '#economy',
        'ul.classList li:nth-child(1)',
      ],
      premiumEconomy: [
        'li[data-cy="premiumEconomy"]',
        '#premiumEconomy',
        'ul.classList li:nth-child(2)',
      ],
      business: [
        'li[data-cy="business"]',
        '#business',
        'ul.classList li:nth-child(3)',
      ],
    },
    searchBtn: [
      'a[data-cy="submit"]',
      '#searchBtn',
      'button.primaryBtn',
      'a.primaryBtn',
      'p.primaryBtn',
      '#flights_submit',
    ],
  },

  // ---------------------------------------------------------------------------
  // Flight search results page
  // ---------------------------------------------------------------------------
  flightResults: {
    resultsList: [
      '.listingCard',
      '.fli-list',
      '[data-cy="flightsList"]',
    ],
    firstResult: [
      '.listingCard:first-child',
      '.fli-list ul li:first-child',
    ],
    price: [
      '.listingCard .priceSection span',
      '.fli-list .price',
      '[data-cy="flightPrice"]',
    ],
    airline: [
      '.listingCard .makeFlex .airlineName',
      '.fli-list .airline-name',
      '[data-cy="airlineName"]',
    ],
    departureTime: [
      '.listingCard .timeDept',
      '.fli-list .depart-time',
      '[data-cy="departTime"]',
    ],
    bookBtn: [
      '.listingCard .primaryBtn',
      '.fli-list button.book',
      '[data-cy="bookNow"]',
    ],
    sortByPrice: [
      'span:has-text("Price")',
      '[data-cy="sortPrice"]',
    ],
    filterStops: {
      nonStop: [
        'label:has-text("Non Stop")',
        'label:has-text("0 Stop")',
        '[data-cy="nonStop"]',
      ],
      oneStop: [
        'label:has-text("1 Stop")',
        '[data-cy="oneStop"]',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Hotels search form
  // ---------------------------------------------------------------------------
  hotels: {
    city: [
      '#city',
      'input#city',
      '[data-cy="hotelCity"]',
      '#hp-widget__sfrom',
    ],
    cityInput: [
      'input[placeholder*="city"]',
      '.react-autosuggest__input',
      '[data-cy="hotelCityInput"]',
    ],
    checkIn: [
      '#checkin',
      '[data-cy="checkIn"]',
      '.dateInner.checkInDate',
    ],
    checkOut: [
      '#checkout',
      '[data-cy="checkOut"]',
      '.dateInner.checkOutDate',
    ],
    roomsGuests: [
      '#roomGuest',
      '[data-cy="roomGuest"]',
      '.paxCounter',
    ],
    searchBtn: [
      '#hsw_search_button',
      'button[data-cy="hotelSearch"]',
      'button.primaryBtn',
      'a.primaryBtn',
    ],
  },

  // ---------------------------------------------------------------------------
  // Hotel search results page
  // ---------------------------------------------------------------------------
  hotelResults: {
    resultsList: [
      '#hotelListingContainer',
      '.listingContainer',
      '[data-cy="hotelList"]',
    ],
    firstResult: [
      '#hotelListingContainer .listingRow:first-child',
      '.listingContainer .hotelCard:first-child',
    ],
    hotelName: [
      '.listingRow .hotelName',
      '.hotelCard h3',
      '[data-cy="hotelName"]',
    ],
    price: [
      '.listingRow .priceSection',
      '.hotelCard .price',
      '[data-cy="hotelPrice"]',
    ],
    starRating: [
      '.listingRow .starRating',
      '.hotelCard .rating',
      '[data-cy="starRating"]',
    ],
    filterByPrice: [
      '.filterSection input[type="range"]',
      '[data-cy="priceFilter"]',
    ],
  },
} as const;

/**
 * Given an array of candidate selectors, return the first one that exists
 * on the page (visible or not). Returns null if none match.
 */
export async function findFirstMatching(
  page: import('@playwright/test').Page,
  candidates: readonly string[],
  timeout = 3000,
): Promise<string | null> {
  for (const sel of candidates) {
    try {
      await page.locator(sel).first().waitFor({ state: 'attached', timeout });
      return sel;
    } catch {
      // try next
    }
  }
  return null;
}
