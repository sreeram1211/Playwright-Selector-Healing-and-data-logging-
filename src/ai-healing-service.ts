/**
 * AI Healing Service — asks an AI provider for a replacement CSS/Playwright
 * selector when the original one fails.
 *
 * Supports Anthropic, OpenAI, and custom provider implementations.
 * Uses only built-in `fetch` (Node 18+) so there are no extra HTTP deps.
 */

import {
  AIHealingService,
  AIProviderConfig,
} from './types';

// ---------------------------------------------------------------------------
// Prompt template shared across providers
// ---------------------------------------------------------------------------

function buildPrompt(failedSelector: string, htmlSnapshot: string): string {
  return [
    'You are an expert at writing Playwright selectors.',
    'A test tried to locate an element with the following selector, but it timed out:',
    '',
    `  Failed selector: ${failedSelector}`,
    '',
    'Below is a simplified snapshot of the current page HTML.',
    'Suggest the single best replacement CSS or Playwright selector that targets the same intended element.',
    'Reply with ONLY the selector string — no explanation, no quotes, no markdown.',
    '',
    '--- HTML SNAPSHOT ---',
    htmlSnapshot,
  ].join('\n');
}

/** Trim an HTML string to a reasonable token budget. */
function trimHtml(html: string, maxChars = 12_000): string {
  if (html.length <= maxChars) return html;
  return html.slice(0, maxChars) + '\n<!-- ... truncated ... -->';
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl: string,
): Promise<string> {
  const url = `${baseUrl}/v1/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = json.content?.[0]?.text?.trim();
  if (!text) throw new Error('Anthropic returned empty response');
  return text;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl: string,
): Promise<string> {
  const url = `${baseUrl}/v1/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned empty response');
  return text;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
};

const DEFAULT_URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
};

const ENV_KEY_MAP: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

/**
 * Create an `AIHealingService` from the given configuration.
 *
 * Throws immediately if required settings (e.g. API key) are missing so that
 * errors surface at fixture-setup time, not mid-test.
 */
export function createAIHealingService(
  config: AIProviderConfig,
): AIHealingService {
  const { provider } = config;

  if (provider === 'custom') {
    if (!config.customHealFn) {
      throw new Error(
        'AIProviderConfig.customHealFn is required when provider is "custom"',
      );
    }
    const fn = config.customHealFn;
    return {
      providerName: 'custom',
      async suggestSelector(failedSelector, htmlSnapshot) {
        return fn(failedSelector, trimHtml(htmlSnapshot));
      },
    };
  }

  const apiKey =
    config.apiKey ?? process.env[ENV_KEY_MAP[provider] ?? ''] ?? '';
  if (!apiKey) {
    throw new Error(
      `No API key provided for "${provider}". ` +
        `Set ${ENV_KEY_MAP[provider]} or pass apiKey in config.`,
    );
  }

  const model = config.model ?? DEFAULT_MODELS[provider] ?? '';
  const baseUrl = config.baseUrl ?? DEFAULT_URLS[provider] ?? '';

  const callFn = provider === 'anthropic' ? callAnthropic : callOpenAI;

  return {
    providerName: provider,
    async suggestSelector(failedSelector, htmlSnapshot) {
      const prompt = buildPrompt(failedSelector, trimHtml(htmlSnapshot));
      return callFn(apiKey, model, prompt, baseUrl);
    },
  };
}
