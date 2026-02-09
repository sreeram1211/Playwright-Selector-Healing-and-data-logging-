import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createAIHealingService } from '../../src/ai-healing-service.ts';
import type { AIProviderConfig } from '../../src/types.ts';

// ---------------------------------------------------------------------------
// Custom provider tests
// ---------------------------------------------------------------------------

describe('createAIHealingService — custom provider', () => {
  it('throws if customHealFn is missing', () => {
    assert.throws(
      () => createAIHealingService({ provider: 'custom' }),
      /customHealFn is required/,
    );
  });

  it('creates a service with providerName "custom"', () => {
    const service = createAIHealingService({
      provider: 'custom',
      customHealFn: async () => '#healed',
    });
    assert.equal(service.providerName, 'custom');
  });

  it('delegates to customHealFn and returns its result', async () => {
    const healFn = mock.fn(async (_sel: string, _html: string) => '#new-btn');
    const service = createAIHealingService({
      provider: 'custom',
      customHealFn: healFn,
    });

    const result = await service.suggestSelector('#old-btn', '<button id="new-btn">Click</button>');
    assert.equal(result, '#new-btn');
    assert.equal(healFn.mock.callCount(), 1);
    assert.equal(healFn.mock.calls[0].arguments[0], '#old-btn');
  });

  it('truncates HTML snapshots longer than 12,000 chars', async () => {
    let receivedHtml = '';
    const service = createAIHealingService({
      provider: 'custom',
      customHealFn: async (_sel, html) => {
        receivedHtml = html;
        return '#x';
      },
    });

    const bigHtml = 'x'.repeat(20_000);
    await service.suggestSelector('#a', bigHtml);
    assert.ok(receivedHtml.length < bigHtml.length);
    assert.ok(receivedHtml.endsWith('<!-- ... truncated ... -->'));
  });

  it('passes through short HTML snapshots unchanged', async () => {
    let receivedHtml = '';
    const service = createAIHealingService({
      provider: 'custom',
      customHealFn: async (_sel, html) => {
        receivedHtml = html;
        return '#x';
      },
    });

    const smallHtml = '<div>hello</div>';
    await service.suggestSelector('#a', smallHtml);
    assert.equal(receivedHtml, smallHtml);
  });
});

// ---------------------------------------------------------------------------
// Anthropic provider tests
// ---------------------------------------------------------------------------

describe('createAIHealingService — anthropic provider', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it('throws if no API key is provided and env is unset', () => {
    delete process.env.ANTHROPIC_API_KEY;
    assert.throws(
      () => createAIHealingService({ provider: 'anthropic' }),
      /No API key provided for "anthropic"/,
    );
  });

  it('reads API key from environment variable', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key-123';
    const service = createAIHealingService({ provider: 'anthropic' });
    assert.equal(service.providerName, 'anthropic');
  });

  it('prefers explicit apiKey over environment variable', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key';
    // Should not throw even if env key is wrong format — we just check it picks the explicit one.
    const service = createAIHealingService({
      provider: 'anthropic',
      apiKey: 'explicit-key',
    });
    assert.equal(service.providerName, 'anthropic');
  });

  it('calls the Anthropic API endpoint and parses response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: ' button.submit ' }],
      }),
      text: async () => '',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-sonnet-4-20250514',
        baseUrl: 'https://mock-api.test',
      });

      const result = await service.suggestSelector('#old', '<html></html>');
      assert.equal(result, 'button.submit');

      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof mock.fn>;
      assert.equal(fetchMock.mock.callCount(), 1);

      const callArgs = fetchMock.mock.calls[0].arguments;
      assert.equal(callArgs[0], 'https://mock-api.test/v1/messages');

      const body = JSON.parse((callArgs[1] as RequestInit).body as string);
      assert.equal(body.model, 'claude-sonnet-4-20250514');
      assert.equal(body.max_tokens, 200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on Anthropic API error response', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'anthropic',
        apiKey: 'bad-key',
      });

      await assert.rejects(
        () => service.suggestSelector('#x', '<html></html>'),
        /Anthropic API error 401/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on empty Anthropic response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ content: [] }),
      text: async () => '',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'anthropic',
        apiKey: 'test-key',
      });

      await assert.rejects(
        () => service.suggestSelector('#x', '<html></html>'),
        /Anthropic returned empty response/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// OpenAI provider tests
// ---------------------------------------------------------------------------

describe('createAIHealingService — openai provider', () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('throws if no API key is provided and env is unset', () => {
    delete process.env.OPENAI_API_KEY;
    assert.throws(
      () => createAIHealingService({ provider: 'openai' }),
      /No API key provided for "openai"/,
    );
  });

  it('reads API key from environment variable', () => {
    process.env.OPENAI_API_KEY = 'test-key-456';
    const service = createAIHealingService({ provider: 'openai' });
    assert.equal(service.providerName, 'openai');
  });

  it('calls the OpenAI API endpoint and parses response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: ' .new-selector ' } }],
      }),
      text: async () => '',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o',
        baseUrl: 'https://mock-openai.test',
      });

      const result = await service.suggestSelector('#old', '<html></html>');
      assert.equal(result, '.new-selector');

      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof mock.fn>;
      const callArgs = fetchMock.mock.calls[0].arguments;
      assert.equal(callArgs[0], 'https://mock-openai.test/v1/chat/completions');

      const reqInit = callArgs[1] as RequestInit;
      const headers = reqInit.headers as Record<string, string>;
      assert.equal(headers['Authorization'], 'Bearer test-key');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on OpenAI API error response', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'openai',
        apiKey: 'test-key',
      });

      await assert.rejects(
        () => service.suggestSelector('#x', '<html></html>'),
        /OpenAI API error 500/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on empty OpenAI response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ choices: [] }),
      text: async () => '',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'openai',
        apiKey: 'test-key',
      });

      await assert.rejects(
        () => service.suggestSelector('#x', '<html></html>'),
        /OpenAI returned empty response/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// Default model/URL tests
// ---------------------------------------------------------------------------

describe('createAIHealingService — defaults', () => {
  it('uses default model for anthropic when not specified', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '#x' }] }),
      text: async () => '',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'anthropic',
        apiKey: 'test-key',
        // model not specified — should use default
      });

      await service.suggestSelector('#a', '<html></html>');

      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof mock.fn>;
      const body = JSON.parse(
        (fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string,
      );
      assert.equal(body.model, 'claude-sonnet-4-20250514');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('uses default base URL for openai when not specified', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '#x' } }],
      }),
      text: async () => '',
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => mockResponse) as unknown as typeof fetch;

    try {
      const service = createAIHealingService({
        provider: 'openai',
        apiKey: 'test-key',
      });

      await service.suggestSelector('#a', '<html></html>');

      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof mock.fn>;
      const url = fetchMock.mock.calls[0].arguments[0] as string;
      assert.ok(url.startsWith('https://api.openai.com'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
