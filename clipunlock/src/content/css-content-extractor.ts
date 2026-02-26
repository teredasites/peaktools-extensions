// ─── CSS Content Extractor ───
// Extracts text rendered via CSS ::before/::after content properties
// that isn't available through normal text selection/copy.

import { createLogger } from '../shared/logger';

const log = createLogger('css-content-extractor');

interface CSSContentMatch {
  element: Element;
  pseudo: '::before' | '::after';
  content: string;
}

/**
 * Check if a CSS content value represents actual readable text
 * (not icons, counters, decorative content, etc.)
 */
function isReadableContent(raw: string): boolean {
  if (!raw || raw === 'none' || raw === 'normal' || raw === '""' || raw === "''") return false;
  // Strip outer quotes
  let text = raw;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }
  if (text.length === 0) return false;
  // Skip CSS counters, attr(), url(), etc.
  if (/^(counter|counters|attr|url|open-quote|close-quote|no-open-quote|no-close-quote)\s*\(/.test(text)) return false;
  // Skip single special characters (icons, bullets, decorators)
  if (text.length === 1 && !/[a-zA-Z0-9]/.test(text)) return false;
  // Skip common icon font content (Unicode private use area)
  if (/^[\uE000-\uF8FF\uF000-\uFFFF]$/.test(text)) return false;
  // Must contain at least some word characters to be "readable"
  if (!/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text)) return false;
  return text.length >= 2;
}

/**
 * Extract the displayable text from a CSS content value
 */
function extractText(raw: string): string {
  let text = raw;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }
  // Unescape CSS escapes like \a (newline), \2019 (right single quote), etc.
  text = text.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_match, hex) => {
    return String.fromCodePoint(parseInt(hex, 16));
  });
  text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\a/g, '\n');
  return text;
}

/**
 * Scan the document for elements with significant CSS-generated text content
 */
export function findCSSGeneratedContent(root?: Document | Element): CSSContentMatch[] {
  const scanRoot = root ?? document.body;
  const matches: CSSContentMatch[] = [];
  const elements = scanRoot.querySelectorAll('*');

  for (let i = 0; i < Math.min(elements.length, 2000); i++) {
    const el = elements[i]!;
    for (const pseudo of ['::before', '::after'] as const) {
      try {
        const style = window.getComputedStyle(el, pseudo);
        const contentVal = style.content;
        if (isReadableContent(contentVal)) {
          const text = extractText(contentVal);
          if (text.length >= 2) {
            matches.push({ element: el, pseudo, content: text });
          }
        }
      } catch {
        // Skip elements that throw on getComputedStyle
      }
    }
  }

  return matches;
}

/**
 * Check if the page has significant text content rendered via CSS pseudo-elements
 * (indicates content hiding via CSS)
 */
export function hasSignificantCSSContent(): boolean {
  const matches = findCSSGeneratedContent();
  // Count total characters of CSS-generated text
  const totalChars = matches.reduce((sum, m) => sum + m.content.length, 0);
  return totalChars > 20;
}

/**
 * Extract all CSS-generated text and inject it as real text nodes
 * so it becomes selectable and copyable.
 */
export function extractAndInjectCSSContent(): number {
  const matches = findCSSGeneratedContent();
  let injected = 0;

  for (const match of matches) {
    try {
      const el = match.element as HTMLElement;
      // Check if we already injected
      if (el.dataset.copyunlockCssExtracted) continue;

      const span = document.createElement('span');
      span.textContent = match.content;
      span.className = 'copyunlock-css-extracted';
      span.style.cssText = 'all: unset; display: inline; user-select: text !important; -webkit-user-select: text !important;';

      if (match.pseudo === '::before') {
        el.prepend(span);
      } else {
        el.append(span);
      }

      // Hide the original pseudo-element content so it's not duplicated
      const hideStyle = document.createElement('style');
      const uniqueClass = `copyunlock-hide-${match.pseudo.replace('::', '')}-${injected}`;
      el.classList.add(uniqueClass);
      hideStyle.textContent = `.${uniqueClass}${match.pseudo} { content: none !important; }`;
      document.head.appendChild(hideStyle);

      el.dataset.copyunlockCssExtracted = 'true';
      injected++;
    } catch (err) {
      log.error('failed to inject CSS content:', err);
    }
  }

  if (injected > 0) {
    log.info(`extracted and injected ${injected} CSS pseudo-element text nodes`);
  }

  return injected;
}

/**
 * Get all CSS-generated text as a single string (for clipboard operations)
 */
export function getAllCSSGeneratedText(): string {
  const matches = findCSSGeneratedContent();
  return matches.map((m) => m.content).join(' ');
}
