/**
 * MakeMyTrip — Custom hybrid healer.
 *
 * This combines two strategies:
 *
 * 1. **Rule-based fallback** — When a known selector fails, it looks up
 *    alternative selectors from the MMT selector map. This is instant and
 *    doesn't need an API key.
 *
 * 2. **AI fallback** — If no known alternative works, it delegates to a
 *    real AI provider (Anthropic / OpenAI) for open-ended DOM analysis.
 *    This is the true power of self-healing: it handles selectors we've
 *    never seen before.
 *
 * For the E2E demo to work *without* an API key, the rule-based layer
 * alone is sufficient for most flows. Set ANTHROPIC_API_KEY or
 * OPENAI_API_KEY to unlock the AI layer.
 */

import { MMT } from './makemytrip.selectors';
import type { AIProviderConfig } from '../../src/types';

// ---------------------------------------------------------------------------
// Build a flat map of selector → fallback candidates from the MMT object.
// ---------------------------------------------------------------------------

type SelectorMap = Map<string, readonly string[]>;

function buildSelectorMap(): SelectorMap {
  const map: SelectorMap = new Map();

  function walk(obj: unknown): void {
    if (Array.isArray(obj)) {
      // Each entry in the array is a candidate; if any one of them is
      // used as a selector and fails, the rest are fallbacks.
      const arr = obj as readonly string[];
      for (const sel of arr) {
        map.set(sel, arr);
      }
      return;
    }
    if (obj && typeof obj === 'object') {
      for (const v of Object.values(obj)) {
        // Skip functions (like datePicker.day) and strings (like BASE_URL)
        if (typeof v === 'function' || typeof v === 'string') continue;
        walk(v);
      }
    }
  }

  walk(MMT);
  return map;
}

const selectorMap = buildSelectorMap();

/**
 * Rule-based healer: if the failed selector is in our known map, return
 * the next candidate that differs from the failed one.
 */
function ruleBased(failedSelector: string, html: string): string | null {
  const candidates = selectorMap.get(failedSelector);
  if (!candidates) return null;

  // Return the first candidate that isn't the one that just failed.
  // We also do a very cheap "is it plausibly in the HTML" check by
  // looking for fragments of the selector in the raw HTML.
  for (const candidate of candidates) {
    if (candidate === failedSelector) continue;

    // Quick heuristic: for ID selectors (#foo), check if the id exists.
    if (candidate.startsWith('#')) {
      const id = candidate.slice(1);
      if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) {
        return candidate;
      }
    }
    // For data-cy selectors, check for the attribute.
    if (candidate.startsWith('[data-cy=')) {
      const attr = candidate.slice(1, -1); // data-cy="value"
      if (html.includes(attr)) {
        return candidate;
      }
    }
    // For class-based selectors (.foo), check for the class.
    if (candidate.startsWith('.')) {
      const cls = candidate.slice(1).split(/[.\s:[\]]/)[0];
      if (cls && html.includes(cls)) {
        return candidate;
      }
    }
    // For anything else, just return it as a best-effort.
    return candidate;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public factory: create the AIProviderConfig for the E2E tests.
// ---------------------------------------------------------------------------

/**
 * Create the AI config for MakeMyTrip E2E tests.
 *
 * - If an AI API key is available, uses a hybrid approach: rule-based first,
 *   then AI fallback.
 * - If no key is available, uses only rule-based healing.
 */
export function createMMTHealerConfig(): AIProviderConfig {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  return {
    provider: 'custom',
    customHealFn: async (failedSelector: string, htmlSnapshot: string) => {
      // 1. Try rule-based healing first (instant, no API).
      const ruleResult = ruleBased(failedSelector, htmlSnapshot);
      if (ruleResult) {
        return ruleResult;
      }

      // 2. If an AI key is available, call the AI for open-ended healing.
      if (hasAnthropicKey || hasOpenAIKey) {
        const { createAIHealingService } = await import('../../src/ai-healing-service');

        const aiService = createAIHealingService({
          provider: hasAnthropicKey ? 'anthropic' : 'openai',
        });

        return aiService.suggestSelector(failedSelector, htmlSnapshot);
      }

      // 3. Last resort: generic heuristics.
      //    For ID selectors, try data-testid equivalent.
      if (failedSelector.startsWith('#')) {
        return `[data-testid="${failedSelector.slice(1)}"]`;
      }
      //    For class selectors, try a text-based or role-based fallback.
      if (failedSelector.startsWith('.')) {
        const className = failedSelector.slice(1).split(/[.\s:[\]]/)[0];
        return `[class*="${className}"]`;
      }

      // Absolute fallback — return the original (will fail, but the error
      // message will be clear).
      return failedSelector;
    },
  };
}
