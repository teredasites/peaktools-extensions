/**
 * Quick-Paste Overlay
 *
 * Injected into the page when user presses Ctrl+Shift+V.
 * Shows a floating popup with recent clipboard items for one-click paste.
 * Items are fetched from the background service worker.
 */

import { sendMessage } from '../shared/messages';
import { createLogger } from '../shared/logger';

const log = createLogger('quick-paste');

let overlayEl: HTMLDivElement | null = null;
let isVisible = false;
let selectedIdx = 0;
let currentItems: QuickPasteItem[] = [];

interface QuickPasteItem {
  id: string;
  preview: string;
  content: string;
  contentType: string;
  pinned: boolean;
  timestamp: number;
  sourceDomain: string;
}

const OVERLAY_ID = '__copyunlock_quickpaste';

function createOverlay(): HTMLDivElement {
  if (overlayEl) return overlayEl;

  overlayEl = document.createElement('div');
  overlayEl.id = OVERLAY_ID;
  overlayEl.setAttribute('role', 'listbox');
  overlayEl.setAttribute('aria-label', 'Quick Paste');

  // Use shadow DOM to isolate styles from page
  const shadow = overlayEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    .qp-container {
      background: #1a1a2e;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.1);
      width: 420px;
      max-height: 460px;
      overflow: hidden;
      animation: qp-fadein 0.15s ease-out;
    }
    @keyframes qp-fadein {
      from { opacity: 0; transform: scale(0.95) translateY(-8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .qp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .qp-title {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
      letter-spacing: 0.02em;
    }
    .qp-shortcut {
      font-size: 11px;
      color: #64748b;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .qp-search {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
    }
    .qp-search::placeholder {
      color: #475569;
    }
    .qp-list {
      overflow-y: auto;
      max-height: 360px;
      padding: 4px 0;
    }
    .qp-item {
      display: flex;
      align-items: flex-start;
      padding: 8px 16px;
      cursor: pointer;
      transition: background 0.1s;
      gap: 10px;
    }
    .qp-item:hover, .qp-item.selected {
      background: rgba(99, 102, 241, 0.12);
    }
    .qp-item.selected {
      border-left: 2px solid #6366f1;
      padding-left: 14px;
    }
    .qp-idx {
      font-size: 11px;
      color: #475569;
      min-width: 16px;
      padding-top: 2px;
      font-weight: 500;
    }
    .qp-content {
      flex: 1;
      min-width: 0;
    }
    .qp-preview {
      font-size: 13px;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }
    .qp-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
      display: flex;
      gap: 8px;
    }
    .qp-pin {
      color: #eab308;
      font-size: 11px;
    }
    .qp-type {
      font-size: 10px;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
      padding: 1px 5px;
      border-radius: 3px;
      margin-top: 1px;
    }
    .qp-empty {
      padding: 24px 16px;
      text-align: center;
      color: #475569;
      font-size: 13px;
    }
    .qp-footer {
      padding: 8px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .qp-hint {
      font-size: 11px;
      color: #475569;
    }
    .qp-hint kbd {
      background: rgba(255, 255, 255, 0.06);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: inherit;
      font-size: 10px;
    }
  `;

  const container = document.createElement('div');
  container.className = 'qp-container';
  container.innerHTML = `
    <div class="qp-header">
      <span class="qp-title">Quick Paste</span>
      <span class="qp-shortcut">Ctrl+Shift+V</span>
    </div>
    <input class="qp-search" type="text" placeholder="Type to filter..." />
    <div class="qp-list"></div>
    <div class="qp-footer">
      <span class="qp-hint"><kbd>&uarr;&darr;</kbd> navigate</span>
      <span class="qp-hint"><kbd>Enter</kbd> paste</span>
      <span class="qp-hint"><kbd>Esc</kbd> close</span>
      <span class="qp-hint"><kbd>1-9</kbd> quick select</span>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);

  // Event handlers on the shadow root
  const searchInput = container.querySelector('.qp-search') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    filterItems(searchInput.value);
  });

  // We store a reference to shadow for later querying
  (overlayEl as any).__shadow = shadow;
  (overlayEl as any).__container = container;

  return overlayEl;
}

function getShadow(): ShadowRoot {
  return (overlayEl as any)?.__shadow as ShadowRoot;
}

function getContainer(): HTMLDivElement {
  return (overlayEl as any)?.__container as HTMLDivElement;
}

function renderItems(items: QuickPasteItem[]): void {
  const shadow = getShadow();
  if (!shadow) return;
  const list = shadow.querySelector('.qp-list') as HTMLDivElement;
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<div class="qp-empty">No clipboard items</div>';
    return;
  }

  list.innerHTML = items.map((item, i) => `
    <div class="qp-item ${i === selectedIdx ? 'selected' : ''}" data-index="${i}" data-id="${item.id}">
      <span class="qp-idx">${i < 9 ? i + 1 : ''}</span>
      <div class="qp-content">
        <div class="qp-preview">${escapeHtml(item.preview)}</div>
        <div class="qp-meta">
          ${item.pinned ? '<span class="qp-pin">&#9733;</span>' : ''}
          <span>${item.sourceDomain || 'unknown'}</span>
          <span>${timeAgo(item.timestamp)}</span>
        </div>
      </div>
      ${item.contentType !== 'text' ? `<span class="qp-type">${item.contentType}</span>` : ''}
    </div>
  `).join('');

  // Click handlers
  list.querySelectorAll('.qp-item').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt((el as HTMLElement).dataset.index || '0', 10);
      pasteItem(idx);
    });
  });
}

function filterItems(query: string): void {
  if (!query.trim()) {
    selectedIdx = 0;
    renderItems(currentItems);
    return;
  }
  const q = query.toLowerCase();
  const filtered = currentItems.filter((item) =>
    item.preview.toLowerCase().includes(q) ||
    item.content.toLowerCase().includes(q) ||
    (item.sourceDomain && item.sourceDomain.toLowerCase().includes(q))
  );
  selectedIdx = 0;
  renderItems(filtered);
}

async function pasteItem(index: number): Promise<void> {
  const shadow = getShadow();
  if (!shadow) return;
  const items = shadow.querySelectorAll('.qp-item');
  if (index < 0 || index >= items.length) return;

  const id = (items[index] as HTMLElement).dataset.id;
  if (!id) return;

  try {
    await sendMessage({ type: 'COPY_ITEM', payload: { id } });
    hide();
    // Small delay then programmatically paste via execCommand
    setTimeout(() => {
      document.execCommand('paste');
    }, 50);
  } catch (err) {
    log.error('quick-paste failed:', err);
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (!isVisible) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    hide();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    const shadow = getShadow();
    const count = shadow?.querySelectorAll('.qp-item').length ?? 0;
    selectedIdx = Math.min(selectedIdx + 1, count - 1);
    const items = shadow?.querySelectorAll('.qp-item');
    items?.forEach((el, i) => {
      (el as HTMLElement).classList.toggle('selected', i === selectedIdx);
    });
    // Scroll into view
    items?.[selectedIdx]?.scrollIntoView({ block: 'nearest' });
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    selectedIdx = Math.max(selectedIdx - 1, 0);
    const shadow = getShadow();
    const items = shadow?.querySelectorAll('.qp-item');
    items?.forEach((el, i) => {
      (el as HTMLElement).classList.toggle('selected', i === selectedIdx);
    });
    items?.[selectedIdx]?.scrollIntoView({ block: 'nearest' });
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    pasteItem(selectedIdx);
    return;
  }

  // Number keys 1-9 for quick select
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= 9) {
    const shadow = getShadow();
    const count = shadow?.querySelectorAll('.qp-item').length ?? 0;
    if (num - 1 < count) {
      e.preventDefault();
      e.stopPropagation();
      pasteItem(num - 1);
    }
    return;
  }
}

export async function show(): Promise<void> {
  if (isVisible) {
    hide();
    return;
  }

  // Fetch items from background
  try {
    const items = await sendMessage({ type: 'QUICK_PASTE_ITEMS', payload: { limit: 10 } }) as QuickPasteItem[];
    currentItems = Array.isArray(items) ? items : [];
  } catch {
    currentItems = [];
  }

  selectedIdx = 0;
  const overlay = createOverlay();

  if (!document.body.contains(overlay)) {
    document.body.appendChild(overlay);
  }

  overlay.style.display = '';
  isVisible = true;
  renderItems(currentItems);

  // Focus the search input
  const shadow = getShadow();
  const searchInput = shadow?.querySelector('.qp-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 50);
  }

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('click', handleClickOutside, true);
}

export function hide(): void {
  if (!isVisible || !overlayEl) return;
  isVisible = false;
  overlayEl.style.display = 'none';
  document.removeEventListener('keydown', handleKeydown, true);
  document.removeEventListener('click', handleClickOutside, true);
}

function handleClickOutside(e: MouseEvent): void {
  if (!overlayEl || !isVisible) return;
  // Check if click is outside the overlay
  if (!overlayEl.contains(e.target as Node)) {
    hide();
  }
}

export function isQuickPasteVisible(): boolean {
  return isVisible;
}

// Helpers
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
