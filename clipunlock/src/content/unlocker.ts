import type { SiteProtectionProfile, UnlockStep } from '../shared/types';
import { extractAndInjectCSSContent } from './css-content-extractor';
import { installFontReversal } from './font-reversal';
import { extractImageText } from './ocr-extractor';
import { createLogger } from '../shared/logger';

const log = createLogger('unlocker');

let injectedStyleEl: HTMLStyleElement | null = null;
const removedAttributes: Array<{ el: Element; attr: string; value: string }> = [];

function injectCSS(css: string): void {
  if (!injectedStyleEl) {
    injectedStyleEl = document.createElement('style');
    injectedStyleEl.id = 'copyunlock-override';
    (document.head || document.documentElement).appendChild(injectedStyleEl);
  }
  injectedStyleEl.textContent += css + '\n';
}

// Dispatch a command to the MAIN world page-world.ts via CustomEvent
function dispatchToPageWorld(action: string): void {
  window.dispatchEvent(new CustomEvent('__copyunlock_cmd', { detail: { action } }));
}

const executors: Record<string, (step: UnlockStep) => void> = {
  'css-override': (_step) => {
    injectCSS(`
      *, *::before, *::after {
        -webkit-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        pointer-events: auto !important;
      }
      ::selection {
        background-color: #338FFF !important;
        color: white !important;
      }
      body, html {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
    `);
  },
  'remove-attribute': (_step) => {
    const handlers = ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'onmousedown', 'ondragstart', 'onblur', 'onfocusout'];
    const targets = [document.documentElement, document.body, ...Array.from(document.querySelectorAll('[oncopy],[oncut],[onpaste],[oncontextmenu],[onselectstart],[onmousedown],[ondragstart]'))];
    for (const el of targets) {
      if (!el) continue;
      for (const h of handlers) {
        const val = el.getAttribute(h);
        if (val) {
          removedAttributes.push({ el, attr: h, value: val });
          el.removeAttribute(h);
        }
      }
      const htmlEl = el as HTMLElement;
      if (htmlEl.oncopy) htmlEl.oncopy = null;
      if (htmlEl.oncut) htmlEl.oncut = null;
      if (htmlEl.onpaste) htmlEl.onpaste = null;
      if (htmlEl.oncontextmenu) htmlEl.oncontextmenu = null;
      if (htmlEl.onselectstart) htmlEl.onselectstart = null;
      if (htmlEl.onmousedown) htmlEl.onmousedown = null;
      if (htmlEl.ondragstart) htmlEl.ondragstart = null;
    }
    const inertEls = document.querySelectorAll('[inert]');
    for (const el of inertEls) {
      if ((el.textContent?.length ?? 0) > 100) {
        removedAttributes.push({ el, attr: 'inert', value: '' });
        el.removeAttribute('inert');
      }
    }
  },
  'null-handler': (_step) => {
    // Dispatch to MAIN world — page's document.oncopy etc. live in MAIN world context
    dispatchToPageWorld('null-handler');
  },
  'prototype-intercept': (_step) => {
    // Dispatch to MAIN world — must patch EventTarget.prototype in page's JS context
    dispatchToPageWorld('prototype-intercept');
  },
  'selective-intercept': (_step) => {
    // Dispatch to MAIN world — capture-phase listeners must run in page's JS context
    dispatchToPageWorld('selective-intercept');
  },
  'force-enable-paste': (_step) => {
    // Dispatch to MAIN world — must intercept paste events in page's JS context
    dispatchToPageWorld('force-enable-paste');
  },
  'force-input-override': (_step) => {
    // Dispatch to MAIN world — blocks input event validators that revert paste
    dispatchToPageWorld('force-input-override');
  },
  'overlay-remove': (_step) => {
    const candidates = Array.from(document.body.querySelectorAll('div, span, section, aside'));
    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      const pos = style.position;
      if (pos !== 'absolute' && pos !== 'fixed' && pos !== 'relative') continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) continue;

      const opacity = parseFloat(style.opacity || '1');
      const textLen = el.textContent?.trim().length ?? 0;
      const bg = style.backgroundColor;
      const isTransparentBg = !bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
      const zIndex = parseInt(style.zIndex || '0', 10);

      // Pattern 1: Near-transparent overlay (any size, no text content)
      if (opacity < 0.1 && textLen === 0) {
        (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
        log.info('removed transparent overlay');
        continue;
      }

      // Pattern 2: Transparent-bg positioned element blocking content below
      if (isTransparentBg && (pos === 'absolute' || pos === 'fixed' || pos === 'relative') && textLen < 5 && rect.width > 30 && rect.height > 30) {
        (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
        log.info('disabled pointer-events on transparent-bg overlay');
        continue;
      }

      // Pattern 3: High z-index overlay with no meaningful content
      if (zIndex > 10 && textLen < 10 && rect.width > 50 && rect.height > 50) {
        const bgOpaque = !isTransparentBg && opacity > 0.1;
        if (!bgOpaque) {
          (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          log.info('disabled pointer-events on high-z overlay');
          continue;
        }
      }

      // Pattern 4: Large full-page overlay
      if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
        if (opacity < 0.1 || (isTransparentBg && textLen < 50)) {
          (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          if (opacity < 0.05) (el as HTMLElement).style.setProperty('display', 'none', 'important');
          log.info('removed large overlay');
        }
      }
    }
  },
  'override-removeAllRanges': (_step) => {
    // Dispatch to MAIN world — must patch Selection.prototype in page's JS context
    dispatchToPageWorld('override-removeAllRanges');
  },
  'prototype-restore': (_step) => {
    // Dispatch to MAIN world — must restore window.getSelection in page's JS context
    dispatchToPageWorld('prototype-restore');
  },
  'strip-chars': (_step) => {
    // Watermark stripping runs automatically in clipboard-interceptor.ts at copy-time.
    // This executor exists so the strategy step is tracked/logged correctly.
    // No additional action needed — interceptor handles WATERMARK_REGEX on every copy.
    log.info('watermark character stripping active (handled at copy-time by clipboard-interceptor)');
  },
  'css-extract': (_step) => {
    // Extract text rendered via CSS ::before/::after pseudo-elements and inject as real text nodes
    const count = extractAndInjectCSSContent();
    log.info(`css-extract: injected ${count} CSS pseudo-element text nodes`);
  },
  'ocr': (_step) => {
    // Extract text from images and canvas elements, overlay selectable text
    const result = extractImageText();
    log.info(`ocr: processed ${result.imagesProcessed} images, found text in ${result.textFound}`);
  },
  'font-reversal': (_step) => {
    // Detect and reverse custom font substitution ciphers
    const result = installFontReversal();
    log.info(`font-reversal: detected ${result.fontsDetected} custom fonts, built ${result.mappingsBuilt} mappings`);
  },
};

export function applyUnlock(profile: SiteProtectionProfile): { appliedSteps: number; errors: string[] } {
  const errors: string[] = [];
  let appliedSteps = 0;
  for (const step of profile.recommendedStrategy.steps) {
    const executor = executors[step.action];
    if (!executor) {
      errors.push(`no executor for action: ${step.action}`);
      continue;
    }
    try {
      executor(step);
      appliedSteps++;
      log.info(`applied: ${step.action} for ${step.target}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${step.action} failed: ${msg}`);
      log.error(`executor error for ${step.action}:`, err);
    }
  }
  return { appliedSteps, errors };
}

export function revertUnlock(): void {
  if (injectedStyleEl) {
    injectedStyleEl.remove();
    injectedStyleEl = null;
  }
  for (const { el, attr, value } of removedAttributes) {
    try { el.setAttribute(attr, value); } catch { /* element may be gone */ }
  }
  removedAttributes.length = 0;
  // MAIN world revert is handled by main.ts dispatching 'revert' to page-world.ts
  log.info('unlock reverted');
}
