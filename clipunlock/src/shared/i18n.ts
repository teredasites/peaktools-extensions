/**
 * Apply i18n translations to all elements with data-i18n attributes.
 * Call once after DOMContentLoaded or at the end of page init.
 *
 * Supported attributes:
 * - data-i18n="key"              → sets textContent
 * - data-i18n-placeholder="key"  → sets placeholder
 * - data-i18n-title="key"        → sets title
 */
export function applyI18n(): void {
  // textContent
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  // placeholder
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.placeholder = msg;
  });

  // title
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.title = msg;
  });
}
