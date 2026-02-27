/**
 * Custom i18n system with language override support.
 *
 * Chrome's built-in chrome.i18n.getMessage() is locked to the browser locale
 * and cannot be overridden per-extension. This module provides a custom
 * translation loader that:
 *
 * 1. Checks chrome.storage.sync for a user-chosen locale ('copyunlock_language')
 * 2. If set (and not 'auto'), fetches that locale's _locales/{locale}/messages.json
 * 3. Uses those translations instead of chrome.i18n.getMessage()
 * 4. Falls back to chrome.i18n.getMessage() when locale is 'auto' or fetch fails
 *
 * Supported HTML attributes (applied by applyI18n()):
 * - data-i18n="key"              → sets textContent
 * - data-i18n-placeholder="key"  → sets placeholder
 * - data-i18n-title="key"        → sets title
 * - data-i18n-html="key"         → sets innerHTML (use carefully)
 */

type MessageEntry = {
  message: string;
  placeholders?: Record<string, { content: string }>;
};

/** Cached custom locale messages (null = use chrome.i18n default) */
let customMessages: Record<string, MessageEntry> | null = null;

/** Current active locale code (or 'auto' for browser default) */
let activeLocale: string = 'auto';

/**
 * Get a translated message by key, with optional substitutions.
 * Uses custom locale if loaded, otherwise falls back to chrome.i18n.getMessage().
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  // If we have a custom locale loaded, use it
  if (customMessages) {
    const entry = customMessages[key];
    if (entry) {
      let msg = entry.message;
      // Handle $1, $2, ... substitutions
      const subs = Array.isArray(substitutions) ? substitutions : substitutions ? [substitutions] : [];
      for (let i = 0; i < subs.length; i++) {
        msg = msg.replace(new RegExp(`\\$${i + 1}`, 'g'), subs[i]);
      }
      // Handle named placeholders ($NAME$ → positional content like $1)
      if (entry.placeholders) {
        for (const [name, ph] of Object.entries(entry.placeholders)) {
          const phPattern = new RegExp(`\\$${name}\\$`, 'gi');
          // ph.content is like "$1" — resolve it
          let resolved = ph.content;
          const match = resolved.match(/^\$(\d+)$/);
          if (match) {
            const idx = parseInt(match[1], 10) - 1;
            resolved = subs[idx] ?? resolved;
          }
          msg = msg.replace(phPattern, resolved);
        }
      }
      return msg;
    }
  }
  // Fallback to Chrome's built-in i18n
  try {
    const subs = Array.isArray(substitutions) ? substitutions : substitutions ? [substitutions] : undefined;
    return chrome.i18n.getMessage(key, subs) || '';
  } catch {
    return '';
  }
}

/**
 * Load a locale's messages.json from the extension's _locales directory.
 * Returns the parsed messages object or null on failure.
 */
async function loadLocaleMessages(locale: string): Promise<Record<string, MessageEntry> | null> {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Initialize the i18n system. Must be called before applyI18n() for custom
 * locale support to work. Safe to call multiple times (re-initializes).
 *
 * @param forceLocale - If provided, use this locale instead of reading from storage
 * @returns The active locale code
 */
export async function initI18n(forceLocale?: string): Promise<string> {
  let locale = forceLocale || 'auto';

  // Read user preference from storage if not forced
  if (!forceLocale) {
    try {
      const result = await chrome.storage.sync.get('copyunlock_language');
      locale = result.copyunlock_language || 'auto';
    } catch {
      locale = 'auto';
    }
  }

  activeLocale = locale;

  if (locale === 'auto') {
    // Use browser default — clear any custom messages
    customMessages = null;
    return locale;
  }

  // Try loading the requested locale
  const messages = await loadLocaleMessages(locale);
  if (messages) {
    customMessages = messages;
    return locale;
  }

  // If exact locale fails, try the base language (e.g., 'pt_BR' → 'pt')
  if (locale.includes('_')) {
    const base = locale.split('_')[0];
    const baseMessages = await loadLocaleMessages(base);
    if (baseMessages) {
      customMessages = baseMessages;
      activeLocale = base;
      return base;
    }
  }

  // Failed to load — fall back to browser default
  customMessages = null;
  activeLocale = 'auto';
  return 'auto';
}

/**
 * Get the currently active locale code.
 */
export function getActiveLocale(): string {
  return activeLocale;
}

/**
 * Apply i18n translations to all elements with data-i18n attributes.
 * Uses the custom locale if initI18n() was called, otherwise uses chrome.i18n defaults.
 */
export function applyI18n(): void {
  // textContent
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const msg = getMessage(key);
    if (msg) el.textContent = msg;
  });

  // placeholder
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    const msg = getMessage(key);
    if (msg) el.placeholder = msg;
  });

  // title
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    const msg = getMessage(key);
    if (msg) el.title = msg;
  });

  // innerHTML (for elements that need formatted text)
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (!key) return;
    const msg = getMessage(key);
    if (msg) el.innerHTML = msg;
  });
}
