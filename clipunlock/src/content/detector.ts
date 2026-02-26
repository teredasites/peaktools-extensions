import type { DetectedMethod, SiteProtectionProfile, Severity, UnlockStrategy, UnlockStep, BlockingCategory, MainWorldData, UnlockMode } from '../shared/types';
import { DETECT_TIMEOUT_MS } from '../shared/constants';
import { hasSignificantCSSContent } from './css-content-extractor';
import { findCustomFonts, buildCharMap } from './font-reversal';
import { hasTextImages } from './ocr-extractor';
import { createLogger } from '../shared/logger';

const log = createLogger('detector');

interface BlockingMethodDef {
  id: number;
  category: BlockingCategory;
  name: string;
  detect: (root: Document | ShadowRoot, mw: MainWorldData) => DetectedMethod | null;
}

function makeMethod(id: number, category: BlockingCategory, name: string, detect: (root: Document | ShadowRoot, mw: MainWorldData) => DetectedMethod | null): BlockingMethodDef {
  return { id, category, name, detect };
}

const METHODS: BlockingMethodDef[] = [
  makeMethod(1, 'css', 'user-select: none', (root, _mw) => {
    let count = 0;
    const els = [root instanceof Document ? root.body : root, ...Array.from((root instanceof Document ? root.body : root).querySelectorAll('*'))];
    for (const el of els.slice(0, 500)) {
      const style = window.getComputedStyle(el as Element);
      if (style.userSelect === 'none' || style.webkitUserSelect === 'none') count++;
    }
    if (count === 0) return null;
    return { id: 1, category: 'css', name: 'user-select: none', elementsAffected: count, confidence: 0.95, bypassable: true, bypassMethod: 'css-override' };
  }),
  makeMethod(2, 'css', '::selection transparent', (root, _mw) => {
    const testEl = (root instanceof Document ? root : root.ownerDocument).createElement('span');
    testEl.textContent = 'test';
    testEl.style.position = 'absolute';
    testEl.style.left = '-9999px';
    (root instanceof Document ? root.body : root).appendChild(testEl);
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(testEl);
    sel?.removeAllRanges();
    sel?.addRange(range);
    const selColor = window.getComputedStyle(testEl, '::selection').backgroundColor;
    sel?.removeAllRanges();
    testEl.remove();
    if (selColor === 'transparent' || selColor === 'rgba(0, 0, 0, 0)') {
      return { id: 2, category: 'css', name: '::selection transparent', elementsAffected: 1, confidence: 0.9, bypassable: true, bypassMethod: 'css-override' };
    }
    return null;
  }),
  makeMethod(3, 'css', '-webkit-touch-callout: none', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    const style = window.getComputedStyle(body as Element);
    if ((style as unknown as Record<string, string>)['-webkit-touch-callout'] === 'none') {
      return { id: 3, category: 'css', name: '-webkit-touch-callout: none', elementsAffected: 1, confidence: 0.8, bypassable: true, bypassMethod: 'css-override' };
    }
    return null;
  }),
  makeMethod(4, 'css', 'pointer-events overlay', (root, _mw) => {
    const els = Array.from((root instanceof Document ? root.body : root).querySelectorAll('*'));
    let count = 0;
    for (const el of els.slice(0, 200)) {
      const style = window.getComputedStyle(el);
      const pos = style.position;
      if ((pos === 'absolute' || pos === 'fixed') && parseInt(style.zIndex || '0', 10) > 100) {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
          const opacity = parseFloat(style.opacity || '1');
          if (opacity < 0.05 || style.pointerEvents === 'none') count++;
        }
      }
    }
    if (count === 0) return null;
    return { id: 4, category: 'css', name: 'pointer-events overlay', elementsAffected: count, confidence: 0.85, bypassable: true, bypassMethod: 'overlay-remove' };
  }),
  makeMethod(5, 'js-event', 'inline oncopy handler', (root, _mw) => {
    const handlers = ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'onmousedown', 'ondragstart'];
    let count = 0;
    const body = root instanceof Document ? root.body : root;
    for (const h of handlers) {
      if ((body as HTMLElement).getAttribute(h)) count++;
    }
    const html = root instanceof Document ? root.documentElement : null;
    if (html) {
      for (const h of handlers) {
        if (html.getAttribute(h)) count++;
      }
    }
    // Also check descendant elements with inline handlers
    const withHandlers = (root instanceof Document ? root.body : root).querySelectorAll('[oncopy],[oncut],[onpaste],[oncontextmenu],[onselectstart],[onmousedown],[ondragstart]');
    count += withHandlers.length;
    if (count === 0) return null;
    return { id: 5, category: 'js-event', name: 'inline oncopy handler', elementsAffected: count, confidence: 0.98, bypassable: true, bypassMethod: 'remove-attribute' };
  }),
  // ─── MAIN WORLD DATA: addEventListener tracking ───
  makeMethod(6, 'js-event', 'addEventListener copy/paste', (_root, mw) => {
    const copyListeners = mw.trackedListeners.filter((l) => ['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(l.type));
    if (copyListeners.length === 0) return null;
    return { id: 6, category: 'js-event', name: 'addEventListener copy/paste', elementsAffected: copyListeners.length, confidence: 0.95, bypassable: true, bypassMethod: 'prototype-intercept' };
  }),
  makeMethod(7, 'js-event', 'contextmenu prevention', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    if ((body as HTMLElement).getAttribute('oncontextmenu')?.includes('return false') ||
        (body as HTMLElement).getAttribute('oncontextmenu')?.includes('preventDefault')) {
      return { id: 7, category: 'js-event', name: 'contextmenu prevention', elementsAffected: 1, confidence: 0.95, bypassable: true, bypassMethod: 'remove-attribute' };
    }
    return null;
  }),
  makeMethod(8, 'js-event', 'selectstart prevention', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    if ((body as HTMLElement).getAttribute('onselectstart')) {
      return { id: 8, category: 'js-event', name: 'selectstart prevention', elementsAffected: 1, confidence: 0.95, bypassable: true, bypassMethod: 'remove-attribute' };
    }
    return null;
  }),
  makeMethod(9, 'js-event', 'dragstart prevention', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    if ((body as HTMLElement).getAttribute('ondragstart')) {
      return { id: 9, category: 'js-event', name: 'dragstart prevention', elementsAffected: 1, confidence: 0.95, bypassable: true, bypassMethod: 'remove-attribute' };
    }
    return null;
  }),
  makeMethod(10, 'js-event', 'mousedown prevention', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    if ((body as HTMLElement).getAttribute('onmousedown')?.includes('return false')) {
      return { id: 10, category: 'js-event', name: 'mousedown prevention', elementsAffected: 1, confidence: 0.9, bypassable: true, bypassMethod: 'remove-attribute' };
    }
    return null;
  }),
  // ─── MAIN WORLD DATA: keydown tracking ───
  makeMethod(11, 'js-event', 'keydown Ctrl+C intercept', (_root, mw) => {
    const kd = mw.trackedListeners.filter((l) => l.type === 'keydown' || l.type === 'keypress');
    if (kd.length === 0) return null;
    return { id: 11, category: 'js-event', name: 'keydown Ctrl+C intercept', elementsAffected: kd.length, confidence: 0.7, bypassable: true, bypassMethod: 'selective-intercept' };
  }),
  makeMethod(12, 'js-advanced', 'getSelection().removeAllRanges() timer', (_root, _mw) => {
    return null; // async — handled separately in detectAsync
  }),
  makeMethod(13, 'js-advanced', 'clipboardData.setData override', (_root, _mw) => {
    try {
      const desc = Object.getOwnPropertyDescriptor(DataTransfer.prototype, 'setData');
      if (desc && !desc.writable && desc.configurable === false) {
        return { id: 13, category: 'js-advanced', name: 'clipboardData.setData override', elementsAffected: 1, confidence: 0.8, bypassable: true, bypassMethod: 'prototype-restore' };
      }
    } catch { /* ignore */ }
    return null;
  }),
  // ─── MAIN WORLD DATA: getSelection override ───
  makeMethod(14, 'js-advanced', 'getSelection function override', (_root, mw) => {
    if (mw.getSelectionOverridden) {
      return { id: 14, category: 'js-advanced', name: 'getSelection function override', elementsAffected: 1, confidence: 0.9, bypassable: true, bypassMethod: 'prototype-restore' };
    }
    return null;
  }),
  makeMethod(15, 'js-advanced', 'MutationObserver re-adding handlers', (_root, _mw) => {
    return null; // Detected dynamically by the counter-observer
  }),
  makeMethod(16, 'js-advanced', 'focus/blur content hiding', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    if ((body as HTMLElement).getAttribute('onblur') || (body as HTMLElement).getAttribute('onfocusout')) {
      return { id: 16, category: 'js-advanced', name: 'focus/blur content hiding', elementsAffected: 1, confidence: 0.6, bypassable: true, bypassMethod: 'remove-attribute' };
    }
    return null;
  }),
  // ─── MAIN WORLD DATA: document.oncopy/oncontextmenu ───
  makeMethod(17, 'js-advanced', 'document.oncopy override', (_root, mw) => {
    if (mw.oncopy) {
      return { id: 17, category: 'js-advanced', name: 'document.oncopy override', elementsAffected: 1, confidence: 0.95, bypassable: true, bypassMethod: 'null-handler' };
    }
    return null;
  }),
  makeMethod(18, 'js-advanced', 'document.oncontextmenu override', (_root, mw) => {
    if (mw.oncontextmenu) {
      return { id: 18, category: 'js-advanced', name: 'document.oncontextmenu override', elementsAffected: 1, confidence: 0.95, bypassable: true, bypassMethod: 'null-handler' };
    }
    return null;
  }),
  makeMethod(19, 'dom', 'transparent overlay div', (root, _mw) => {
    const els = Array.from((root instanceof Document ? root.body : root).querySelectorAll('div, span'));
    let count = 0;
    for (const el of els.slice(0, 300)) {
      const style = window.getComputedStyle(el);
      const pos = style.position;
      if (pos !== 'absolute' && pos !== 'fixed' && pos !== 'relative') continue;
      const opacity = parseFloat(style.opacity || '1');
      const rect = el.getBoundingClientRect();
      const textLen = el.textContent?.trim().length ?? 0;
      const bg = style.backgroundColor;
      const isTransparentBg = !bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
      // Pattern 1: Near-transparent overlay with no content
      if (opacity < 0.1 && rect.width > 30 && rect.height > 30 && textLen === 0) {
        count++;
        continue;
      }
      // Pattern 2: Transparent-bg positioned element with high z-index, no meaningful text
      const zIndex = parseInt(style.zIndex || '0', 10);
      if (isTransparentBg && zIndex > 0 && textLen < 5 && rect.width > 50 && rect.height > 50) {
        count++;
        continue;
      }
      // Pattern 3: Large full-page overlay
      if ((pos === 'absolute' || pos === 'fixed') && opacity < 0.05 && rect.width > 100 && rect.height > 100) {
        count++;
      }
    }
    if (count === 0) return null;
    return { id: 19, category: 'dom', name: 'transparent overlay div', elementsAffected: count, confidence: 0.8, bypassable: true, bypassMethod: 'overlay-remove' };
  }),
  makeMethod(20, 'dom', 'closed Shadow DOM', (root, _mw) => {
    const els = Array.from((root instanceof Document ? root.body : root).querySelectorAll('*'));
    let count = 0;
    for (const el of els.slice(0, 500)) {
      if (el.shadowRoot === null && el.tagName.includes('-')) count++;
    }
    if (count === 0) return null;
    return { id: 20, category: 'dom', name: 'closed Shadow DOM', elementsAffected: count, confidence: 0.5, bypassable: false, bypassMethod: null };
  }),
  makeMethod(21, 'dom', 'cross-origin iframe', (root, _mw) => {
    const iframes = Array.from((root instanceof Document ? root.body : root).querySelectorAll('iframe'));
    let count = 0;
    for (const iframe of iframes) {
      try {
        const _doc = iframe.contentDocument;
        if (!_doc) count++;
      } catch {
        count++;
      }
    }
    if (count === 0) return null;
    return { id: 21, category: 'dom', name: 'cross-origin iframe', elementsAffected: count, confidence: 0.9, bypassable: false, bypassMethod: null };
  }),
  makeMethod(22, 'dom', 'inert attribute', (root, _mw) => {
    const inertEls = (root instanceof Document ? root.body : root).querySelectorAll('[inert]');
    if (inertEls.length === 0) return null;
    return { id: 22, category: 'dom', name: 'inert attribute', elementsAffected: inertEls.length, confidence: 0.95, bypassable: true, bypassMethod: 'remove-attribute' };
  }),
  makeMethod(23, 'dom', 'contenteditable false', (root, _mw) => {
    const body = root instanceof Document ? root.body : root;
    if ((body as HTMLElement).contentEditable === 'false' || (body as HTMLElement).getAttribute('contenteditable') === 'false') {
      return { id: 23, category: 'dom', name: 'contenteditable false', elementsAffected: 1, confidence: 0.7, bypassable: true, bypassMethod: 'remove-attribute' };
    }
    return null;
  }),
  makeMethod(26, 'server', 'watermark injection (zero-width chars)', (_root, _mw) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const text = sel.toString();
    const zwCount = (text.match(/[\u200B\u200C\u200D\u200E\u200F\u2060\uFEFF\u2063\u2061\u2062\u00AD]/g) || []).length;
    if (zwCount === 0) return null;
    return { id: 26, category: 'server', name: 'watermark injection', elementsAffected: 1, confidence: 0.9, bypassable: true, bypassMethod: 'strip-chars' };
  }),
  makeMethod(28, 'server', 'visibility toggle on print', (_root, _mw) => {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSMediaRule && rule.conditionText === 'print') {
            const text = rule.cssText;
            if (text.includes('display: none') || text.includes('visibility: hidden')) {
              return { id: 28, category: 'server', name: 'visibility toggle on print', elementsAffected: 1, confidence: 0.7, bypassable: true, bypassMethod: 'css-override' };
            }
          }
        }
      } catch { /* skip cross-origin */ }
    }
    return null;
  }),
  makeMethod(29, 'server', 'right-click JavaScript void', (root, _mw) => {
    const links = Array.from((root instanceof Document ? root.body : root).querySelectorAll('a[href^="javascript:void"]'));
    if (links.length === 0) return null;
    return { id: 29, category: 'server', name: 'right-click JavaScript void', elementsAffected: links.length, confidence: 0.6, bypassable: true, bypassMethod: 'remove-attribute' };
  }),
  // ─── MAIN WORLD DATA: paste event tracking ───
  makeMethod(30, 'js-event', 'paste event blocking', (_root, mw) => {
    const pasteListeners = mw.trackedListeners.filter((l) => l.type === 'paste');
    if (pasteListeners.length === 0) return null;
    return { id: 30, category: 'js-event', name: 'paste event blocking', elementsAffected: pasteListeners.length, confidence: 0.9, bypassable: true, bypassMethod: 'force-enable-paste' };
  }),
  // ─── MAIN WORLD DATA: document.onselectstart ───
  makeMethod(31, 'js-event', 'document.onselectstart override', (_root, mw) => {
    if (mw.onselectstart) {
      return { id: 31, category: 'js-event', name: 'document.onselectstart override', elementsAffected: 1, confidence: 0.95, bypassable: true, bypassMethod: 'null-handler' };
    }
    return null;
  }),
  // ─── MAIN WORLD DATA: mousedown tracking (for selection block) ───
  makeMethod(32, 'js-event', 'mousedown listener', (_root, mw) => {
    const md = mw.trackedListeners.filter((l) => l.type === 'mousedown');
    if (md.length === 0) return null;
    return { id: 32, category: 'js-event', name: 'mousedown listener blocking selection', elementsAffected: md.length, confidence: 0.6, bypassable: true, bypassMethod: 'selective-intercept' };
  }),
  // ─── Image-based text detection (OCR) ───
  makeMethod(24, 'server', 'image-based text', (_root, _mw) => {
    try {
      if (hasTextImages()) {
        return { id: 24, category: 'server', name: 'image-based text', elementsAffected: 1, confidence: 0.7, bypassable: true, bypassMethod: 'ocr' };
      }
    } catch { /* ignore */ }
    return null;
  }),
  // ─── Custom font cipher detection ───
  makeMethod(25, 'server', 'custom font cipher', (_root, _mw) => {
    try {
      const customFonts = findCustomFonts();
      if (customFonts.length === 0) return null;
      // Check if any custom font has character substitutions
      for (const font of customFonts.slice(0, 3)) {
        const mapping = buildCharMap(font);
        if (mapping.charMap.size > 3) {
          return { id: 25, category: 'server', name: 'custom font cipher', elementsAffected: 1, confidence: 0.8, bypassable: true, bypassMethod: 'font-reversal' };
        }
      }
    } catch { /* ignore */ }
    return null;
  }),
  // ─── CSS pseudo-element content detection ───
  makeMethod(27, 'server', 'CSS ::before/::after content', (_root, _mw) => {
    try {
      if (hasSignificantCSSContent()) {
        return { id: 27, category: 'server', name: 'CSS ::before/::after content', elementsAffected: 1, confidence: 0.75, bypassable: true, bypassMethod: 'css-extract' };
      }
    } catch { /* ignore */ }
    return null;
  }),
];

async function detectTimerClear(): Promise<DetectedMethod | null> {
  return new Promise((resolve) => {
    const testEl = document.createElement('span');
    testEl.textContent = 'CopyUnlock detection test';
    testEl.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(testEl);
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(testEl);
    sel?.removeAllRanges();
    sel?.addRange(range);
    setTimeout(() => {
      const stillSelected = sel && sel.rangeCount > 0 && sel.toString().length > 0;
      testEl.remove();
      if (!stillSelected) {
        resolve({
          id: 12, category: 'js-advanced', name: 'getSelection().removeAllRanges() timer',
          elementsAffected: 1, confidence: 0.85, bypassable: true, bypassMethod: 'override-removeAllRanges',
        });
      } else {
        resolve(null);
      }
    }, 150);
  });
}

function calcSeverity(methods: DetectedMethod[]): Severity {
  if (methods.length === 0) return 'none';
  if (methods.length <= 2 && methods.every((m) => m.category === 'css')) return 'light';
  if (methods.length <= 4) return 'moderate';
  if (methods.length <= 8) return 'heavy';
  return 'extreme';
}

function buildStrategy(methods: DetectedMethod[], mode: UnlockMode): UnlockStrategy {
  const steps: UnlockStep[] = [];
  const addedActions = new Set<string>();

  // Add steps for each detected method's bypass
  for (const m of methods) {
    if (!m.bypassable) continue;
    if (mode === 'safe' && (m.category === 'js-advanced' || m.category === 'server')) continue;
    const action = m.bypassMethod ?? 'unknown';
    if (action === 'unknown') continue;
    if (!addedActions.has(action)) {
      steps.push({
        methodId: m.id,
        action,
        target: m.name,
        riskLevel: m.category === 'css' ? 'none' : m.category === 'js-event' ? 'low' : 'medium',
      });
      addedActions.add(action);
    }
  }

  // ─── Auto mode: if ANY protection detected, proactively add core safe unlocks ───
  if (mode === 'auto' && methods.length > 0) {
    const coreAutoSteps: Array<{ action: string; target: string; risk: 'none' | 'low' | 'medium' }> = [
      { action: 'css-override', target: 'user-select override', risk: 'none' },
      { action: 'remove-attribute', target: 'inline handler removal', risk: 'low' },
      { action: 'null-handler', target: 'document handler nulling', risk: 'low' },
      { action: 'selective-intercept', target: 'event propagation block', risk: 'low' },
      { action: 'prototype-intercept', target: 'addEventListener intercept', risk: 'low' },
      { action: 'override-removeAllRanges', target: 'selection protection', risk: 'low' },
      { action: 'overlay-remove', target: 'overlay click-through', risk: 'low' },
      { action: 'force-enable-paste', target: 'paste re-enable', risk: 'low' },
      { action: 'force-input-override', target: 'input validation bypass', risk: 'low' },
      { action: 'prototype-restore', target: 'native function restore', risk: 'medium' },
    ];
    for (const cs of coreAutoSteps) {
      if (!addedActions.has(cs.action)) {
        steps.push({ methodId: 0, action: cs.action, target: cs.target, riskLevel: cs.risk });
        addedActions.add(cs.action);
      }
    }
  }

  // ─── Aggressive mode: apply EVERYTHING regardless of detection ───
  if (mode === 'aggressive') {
    const allSteps: Array<{ action: string; target: string; risk: 'none' | 'low' | 'medium' }> = [
      { action: 'css-override', target: 'user-select override', risk: 'none' },
      { action: 'remove-attribute', target: 'inline handler removal', risk: 'low' },
      { action: 'null-handler', target: 'document handler nulling', risk: 'low' },
      { action: 'prototype-intercept', target: 'addEventListener intercept', risk: 'low' },
      { action: 'selective-intercept', target: 'event propagation block', risk: 'low' },
      { action: 'force-enable-paste', target: 'paste re-enable', risk: 'low' },
      { action: 'force-input-override', target: 'input validation bypass', risk: 'medium' },
      { action: 'overlay-remove', target: 'overlay click-through', risk: 'low' },
      { action: 'override-removeAllRanges', target: 'selection protection', risk: 'low' },
      { action: 'prototype-restore', target: 'native function restore', risk: 'medium' },
    ];
    for (const as_ of allSteps) {
      if (!addedActions.has(as_.action)) {
        steps.push({ methodId: 0, action: as_.action, target: as_.target, riskLevel: as_.risk });
        addedActions.add(as_.action);
      }
    }
  }

  return { mode, steps, estimatedTimeMs: steps.length * 5 };
}

export async function detectProtections(mode: UnlockMode = 'auto', mainWorldData?: MainWorldData): Promise<SiteProtectionProfile> {
  const start = performance.now();
  const detected: DetectedMethod[] = [];
  const mw: MainWorldData = mainWorldData ?? {
    trackedListeners: [],
    oncopy: false, oncut: false, onpaste: false,
    oncontextmenu: false, onselectstart: false,
    getSelectionOverridden: false,
  };
  for (const method of METHODS) {
    if (performance.now() - start > DETECT_TIMEOUT_MS) {
      log.warn('detection timeout, scanned', detected.length, 'methods');
      break;
    }
    try {
      const result = method.detect(document, mw);
      if (result) detected.push(result);
    } catch (err) {
      log.error(`detection error for method ${method.id}:`, err);
    }
  }
  try {
    const timerResult = await detectTimerClear();
    if (timerResult) detected.push(timerResult);
  } catch { /* ignore */ }
  const severity = calcSeverity(detected);
  const strategy = buildStrategy(detected, mode);
  log.info(`detected ${detected.length} methods, severity: ${severity}, took ${(performance.now() - start).toFixed(1)}ms`);
  return {
    domain: location.hostname,
    url: location.href,
    timestamp: Date.now(),
    methods: detected,
    severity,
    recommendedStrategy: strategy,
    safeModeConflicts: [],
  };
}
