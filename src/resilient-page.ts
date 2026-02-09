/**
 * ResilientPage — wraps a Playwright Page with self-healing selectors
 * and automatic accessibility scanning after every action.
 */

import type { Page, Locator } from '@playwright/test';
import {
  AIHealingService,
  HealingEvent,
  A11yViolation,
  ResilientAuditorConfig,
  DEFAULT_CONFIG,
} from './types';
import { createAIHealingService } from './ai-healing-service';
import { runAccessibilityScan } from './accessibility-scanner';

export class ResilientPage {
  readonly page: Page;

  private readonly aiService: AIHealingService | null;
  private readonly a11yEnabled: boolean;
  private readonly locatorTimeout: number;
  private readonly maxRetries: number;

  /** Accumulated healing events for the current test. */
  readonly healingEvents: HealingEvent[] = [];
  /** Accumulated a11y violations for the current test. */
  readonly a11yViolations: A11yViolation[] = [];

  constructor(page: Page, config: Partial<ResilientAuditorConfig> = {}) {
    this.page = page;

    const merged = { ...DEFAULT_CONFIG, ...config };

    this.aiService =
      merged.ai !== false ? createAIHealingService(merged.ai) : null;
    this.a11yEnabled = merged.a11yEnabled;
    this.locatorTimeout = merged.locatorTimeout;
    this.maxRetries = merged.maxHealingRetries;
  }

  // -----------------------------------------------------------------------
  // Self-healing locator helper
  // -----------------------------------------------------------------------

  /**
   * Attempt to resolve a locator. If it fails (timeout) and AI healing is
   * enabled, ask the AI for a better selector, then retry.
   */
  private async healAndRetry(
    selector: string,
    action: string,
    fn: (loc: Locator) => Promise<void>,
  ): Promise<void> {
    // 1. First attempt with the original selector.
    const locator = this.page.locator(selector);
    try {
      await locator.waitFor({ state: 'attached', timeout: this.locatorTimeout });
      await fn(locator);
      return;
    } catch {
      // Selector failed — fall through to healing logic.
    }

    // 2. If no AI service, rethrow with a clear message.
    if (!this.aiService) {
      throw new Error(
        `Selector "${selector}" timed out and AI healing is disabled.`,
      );
    }

    // 3. Healing loop.
    let lastError: unknown;
    let currentSelector = selector;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const html = await this.page.content();
      const suggested = await this.aiService.suggestSelector(
        currentSelector,
        html,
      );

      const healedLocator = this.page.locator(suggested);
      try {
        await healedLocator.waitFor({
          state: 'attached',
          timeout: this.locatorTimeout,
        });
        await fn(healedLocator);

        // Success — record the healing event.
        this.healingEvents.push({
          originalSelector: selector,
          healedSelector: suggested,
          action,
          timestamp: new Date().toISOString(),
          aiProvider: this.aiService.providerName,
        });
        return;
      } catch (err) {
        lastError = err;
        currentSelector = suggested; // feed the failed suggestion back
      }
    }

    throw new Error(
      `Selector "${selector}" could not be healed after ${this.maxRetries} attempt(s). ` +
        `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  // -----------------------------------------------------------------------
  // After-action hook
  // -----------------------------------------------------------------------

  private async afterAction(action: string): Promise<void> {
    if (!this.a11yEnabled) return;
    try {
      const violations = await runAccessibilityScan(this.page, action);
      this.a11yViolations.push(...violations);
    } catch {
      // axe-core can fail on certain pages (e.g., about:blank). Swallow.
    }
  }

  // -----------------------------------------------------------------------
  // Public action methods (the ones users call)
  // -----------------------------------------------------------------------

  /**
   * Self-healing wrapper around `page.locator(selector).click()`.
   */
  async click(selector: string, options?: Record<string, unknown>): Promise<void> {
    await this.healAndRetry(selector, 'click', async (loc) => {
      await loc.click(options);
    });
    await this.afterAction('click');
  }

  /**
   * Self-healing wrapper around `page.locator(selector).fill()`.
   */
  async fill(
    selector: string,
    value: string,
    options?: Record<string, unknown>,
  ): Promise<void> {
    await this.healAndRetry(selector, 'fill', async (loc) => {
      await loc.fill(value, options);
    });
    await this.afterAction('fill');
  }

  /**
   * Navigate to a URL and run an a11y scan afterward.
   */
  async goto(url: string, options?: Record<string, unknown>): Promise<void> {
    await this.page.goto(url, options);
    await this.afterAction('goto');
  }

  /**
   * Self-healing wrapper that returns a locator's text content.
   */
  async textContent(
    selector: string,
    options?: Record<string, unknown>,
  ): Promise<string | null> {
    let result: string | null = null;
    await this.healAndRetry(selector, 'textContent', async (loc) => {
      result = await loc.textContent(options);
    });
    return result;
  }

  /**
   * Self-healing wrapper that returns a locator's inner text.
   */
  async innerText(
    selector: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    let result = '';
    await this.healAndRetry(selector, 'innerText', async (loc) => {
      result = await loc.innerText(options);
    });
    return result;
  }

  /**
   * Self-healing wrapper that returns a locator's input value.
   */
  async inputValue(
    selector: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    let result = '';
    await this.healAndRetry(selector, 'inputValue', async (loc) => {
      result = await loc.inputValue(options);
    });
    return result;
  }

  /**
   * Self-healing wrapper that checks if a locator is visible.
   */
  async isVisible(selector: string): Promise<boolean> {
    let result = false;
    await this.healAndRetry(selector, 'isVisible', async (loc) => {
      result = await loc.isVisible();
    });
    return result;
  }

  /**
   * Direct access to the underlying page.locator() — no healing,
   * useful when you need the raw Playwright API.
   */
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }
}
