import type { SiteProtectionProfile } from '../shared/types';
import { COUNTER_OBS_MAX_OPS_SEC, COUNTER_OBS_BACKOFF_BASE_MS, COUNTER_OBS_BACKOFF_MAX_MS } from '../shared/constants';
import { createLogger } from '../shared/logger';

const log = createLogger('counter-observer');

const PROTECTION_ATTRS = new Set([
  'oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart',
  'onmousedown', 'ondragstart', 'style', 'inert',
]);

interface BackoffState {
  count: number;
  delay: number;
  lastOp: number;
}

export class CounterObserver {
  private observer: MutationObserver | null = null;
  private backoff: Map<string, BackoffState> = new Map();
  private opCount = 0;
  private opResetTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;

  start(_profile: SiteProtectionProfile): void {
    if (this.active) return;
    this.active = true;
    this.opResetTimer = setInterval(() => { this.opCount = 0; }, 1000);
    this.observer = new MutationObserver((mutations) => {
      if (this.opCount >= COUNTER_OBS_MAX_OPS_SEC) return;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          this.handleAttributeMutation(mutation);
        }
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            this.handleAddedNode(node);
          }
        }
      }
    });
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: Array.from(PROTECTION_ATTRS),
      childList: true,
      subtree: true,
    });
    log.info('counter-observer started');
  }

  stop(): void {
    this.active = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.opResetTimer) {
      clearInterval(this.opResetTimer);
      this.opResetTimer = null;
    }
    this.backoff.clear();
    log.info('counter-observer stopped');
  }

  private handleAttributeMutation(mutation: MutationRecord): void {
    const attr = mutation.attributeName;
    if (!attr || !PROTECTION_ATTRS.has(attr)) return;
    const el = mutation.target as Element;
    const key = `${this.elKey(el)}:${attr}`;
    const state = this.backoff.get(key);
    if (state) {
      const elapsed = Date.now() - state.lastOp;
      if (elapsed < state.delay) return;
      state.count++;
      state.delay = Math.min(state.delay * 2, COUNTER_OBS_BACKOFF_MAX_MS);
      state.lastOp = Date.now();
    } else {
      this.backoff.set(key, { count: 1, delay: COUNTER_OBS_BACKOFF_BASE_MS, lastOp: Date.now() });
    }
    if (attr === 'style') {
      const style = window.getComputedStyle(el);
      if (style.userSelect === 'none') {
        (el as HTMLElement).style.userSelect = 'text';
        this.opCount++;
        log.debug(`re-stripped user-select on ${el.tagName}`);
      }
    } else if (attr === 'inert') {
      if (el.hasAttribute('inert') && (el.textContent?.length ?? 0) > 100) {
        el.removeAttribute('inert');
        this.opCount++;
        log.debug('re-stripped inert attribute');
      }
    } else {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
        this.opCount++;
        log.debug(`re-stripped ${attr} on ${el.tagName}`);
      }
    }
  }

  private handleAddedNode(node: Node): void {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.tagName === 'SCRIPT') {
      const text = el.textContent ?? '';
      if (text.includes('oncopy') || text.includes('onselectstart') || text.includes('oncontextmenu') ||
          text.includes('user-select') || text.includes('removeAllRanges')) {
        log.warn('detected re-protection script injection, removing');
        el.remove();
        this.opCount++;
      }
    }
    if (el.tagName === 'STYLE') {
      const text = el.textContent ?? '';
      if (text.includes('user-select: none') || text.includes('user-select:none')) {
        log.warn('detected re-protection style injection');
        (el as HTMLStyleElement).textContent = text
          .replace(/user-select\s*:\s*none/g, 'user-select: text')
          .replace(/-webkit-user-select\s*:\s*none/g, '-webkit-user-select: text');
        this.opCount++;
      }
    }
    const style = window.getComputedStyle(el);
    if ((style.position === 'absolute' || style.position === 'fixed') && parseFloat(style.opacity) < 0.05) {
      const rect = el.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
        (el as HTMLElement).style.display = 'none';
        this.opCount++;
        log.info('removed re-added overlay');
      }
    }
  }

  private elKey(el: Element): string {
    return `${el.tagName}#${el.id || ''}.${el.className || ''}`;
  }
}
