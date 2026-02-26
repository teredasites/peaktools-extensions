// Types — match ClipboardEntry from shared/types.ts
interface ClipItem {
  id: string;
  content: string;
  preview: string;
  contentType: string;
  timestamp: number;
  pinned: boolean;
  sourceDomain?: string;
  wordCount?: number;
  tags?: string[];
}

// State
let allItems: ClipItem[] = [];
let filteredItems: ClipItem[] = [];
let selectedIndex = -1;
let currentFilter = 'all';
let searchQuery = '';
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// DOM Refs
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const clipList = document.getElementById('clip-list') as HTMLDivElement;
const detailPanel = document.getElementById('detail-panel') as HTMLDivElement;
const detailBack = document.getElementById('detail-back') as HTMLButtonElement;
const detailCopy = document.getElementById('detail-copy') as HTMLButtonElement;
const detailPin = document.getElementById('detail-pin') as HTMLButtonElement;
const detailDelete = document.getElementById('detail-delete') as HTMLButtonElement;
const detailContent = document.getElementById('detail-content') as HTMLDivElement;
const detailMeta = document.getElementById('detail-meta') as HTMLDivElement;
const detailTags = document.getElementById('detail-tags') as HTMLDivElement;
const itemCountEl = document.getElementById('item-count') as HTMLSpanElement;
const clearAllBtn = document.getElementById('clear-all') as HTMLButtonElement;
const filterChips = document.querySelectorAll('.filter-chip') as NodeListOf<HTMLButtonElement>;

// Virtual Scrolling
const ITEM_HEIGHT = 62;
const BUFFER_SIZE = 5;

function renderList(): void {
  if (filteredItems.length === 0) {
    clipList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128203;</div>
        <div class="empty-text">${chrome.i18n.getMessage('noHistory') || 'No clipboard items'}</div>
      </div>
    `;
    itemCountEl.textContent = chrome.i18n.getMessage('items', ['0']) || '0 items';
    return;
  }

  const scrollTop = clipList.scrollTop;
  const containerHeight = clipList.clientHeight;
  const totalHeight = filteredItems.length * ITEM_HEIGHT;

  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
  const endIdx = Math.min(filteredItems.length, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE);

  const visibleItems = filteredItems.slice(startIdx, endIdx);

  clipList.innerHTML = `
    <div class="virtual-scroll-container">
      <div class="virtual-scroll-spacer" style="height: ${totalHeight}px;">
        <div style="transform: translateY(${startIdx * ITEM_HEIGHT}px);">
          ${visibleItems.map((item, i) => {
            const globalIdx = startIdx + i;
            return `
              <div class="clip-item ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
                <div class="item-top">
                  ${item.pinned ? '<span class="pin-indicator">&#128204;</span>' : ''}
                  <span class="preview">${escapeHtml(item.preview)}</span>
                  <span class="type-badge">${item.contentType}</span>
                </div>
                <div class="meta">
                  <span class="time">${timeAgo(item.timestamp)}</span>
                  ${item.wordCount ? `<span class="word-count">${item.wordCount} words</span>` : ''}
                  ${item.sourceDomain ? `<span class="source">${item.sourceDomain}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  itemCountEl.textContent = chrome.i18n.getMessage('items', [String(filteredItems.length)]) || `${filteredItems.length} items`;

  // Click handlers
  clipList.querySelectorAll('.clip-item').forEach((el) => {
    el.addEventListener('click', () => {
      const index = parseInt((el as HTMLElement).dataset.index || '0', 10);
      openDetail(index);
    });
  });
}

function openDetail(index: number): void {
  if (index < 0 || index >= filteredItems.length) return;
  selectedIndex = index;
  const item = filteredItems[index];

  detailContent.textContent = item.content;
  detailMeta.innerHTML = `
    <div>Type: ${item.contentType} &bull; ${timeAgo(item.timestamp)} &bull; ${item.wordCount || 0} words</div>
    ${item.sourceDomain ? `<div>Source: ${item.sourceDomain}</div>` : ''}
  `;
  detailTags.innerHTML = (item.tags || [])
    .map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`)
    .join('');
  detailPin.textContent = item.pinned
    ? (chrome.i18n.getMessage('unpin') || 'Unpin')
    : (chrome.i18n.getMessage('pin') || 'Pin');

  detailPanel.classList.remove('hidden');
}

function closeDetail(): void {
  selectedIndex = -1;
  detailPanel.classList.add('hidden');
  renderList();
}

function applyFilter(): void {
  let items = [...allItems];

  // Apply type filter
  switch (currentFilter) {
    case 'pinned':
      items = items.filter((i) => i.pinned);
      break;
    case 'url':
      items = items.filter((i) => i.contentType === 'url');
      break;
    case 'code':
      items = items.filter((i) => i.contentType === 'code');
      break;
    case 'text':
      items = items.filter((i) => i.contentType === 'text');
      break;
    default:
      break;
  }

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    items = items.filter(
      (i) =>
        i.content.toLowerCase().includes(q) ||
        i.preview.toLowerCase().includes(q) ||
        (i.sourceDomain && i.sourceDomain.toLowerCase().includes(q))
    );
  }

  filteredItems = items;
  renderList();
}

async function loadItems(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CLIPBOARD_HISTORY',
      payload: { limit: 5000 },
    });
    allItems = Array.isArray(response) ? response : [];
    applyFilter();
  } catch {
    allItems = [];
    applyFilter();
  }
}

// Search debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
searchInput.addEventListener('input', () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = searchInput.value;
    applyFilter();
  }, 200);
});

// Filter chips
filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    filterChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter || 'all';
    applyFilter();
  });
});

// Keyboard navigation
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === '/') {
    e.preventDefault();
    searchInput.focus();
    return;
  }

  if (e.key === 'Escape') {
    if (!detailPanel.classList.contains('hidden')) {
      closeDetail();
    } else if (document.activeElement === searchInput) {
      searchInput.blur();
      searchInput.value = '';
      searchQuery = '';
      applyFilter();
    }
    return;
  }

  if (document.activeElement === searchInput) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
    renderList();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderList();
  } else if (e.key === 'Enter' && selectedIndex >= 0) {
    e.preventDefault();
    openDetail(selectedIndex);
  }
});

// Detail panel actions
detailBack.addEventListener('click', closeDetail);

detailCopy.addEventListener('click', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  try {
    await chrome.runtime.sendMessage({ type: 'COPY_ITEM', payload: { id: item.id } });
    detailCopy.textContent = chrome.i18n.getMessage('copied') || 'Copied!';
    setTimeout(() => {
      detailCopy.textContent = chrome.i18n.getMessage('copy') || 'Copy';
    }, 1500);
  } catch {
    // Silently fail
  }
});

detailPin.addEventListener('click', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  try {
    await chrome.runtime.sendMessage({
      type: 'PIN_CLIPBOARD_ITEM',
      payload: { id: item.id, pinned: !item.pinned },
    });
    item.pinned = !item.pinned;
    detailPin.textContent = item.pinned
      ? (chrome.i18n.getMessage('unpin') || 'Unpin')
      : (chrome.i18n.getMessage('pin') || 'Pin');
    renderList();
  } catch {
    // Silently fail
  }
});

detailDelete.addEventListener('click', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  try {
    await chrome.runtime.sendMessage({
      type: 'DELETE_CLIPBOARD_ITEM',
      payload: { id: item.id },
    });
    allItems = allItems.filter((i) => i.id !== item.id);
    closeDetail();
    applyFilter();
  } catch {
    // Silently fail
  }
});

// Clear all
clearAllBtn.addEventListener('click', async () => {
  const msg = chrome.i18n.getMessage('clearConfirm') || 'Clear all clipboard history?';
  if (!confirm(msg)) return;
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_CLIPBOARD', payload: {} });
    allItems = [];
    applyFilter();
  } catch {
    // Silently fail
  }
});

// Scroll-based re-render for virtual scroll
clipList.addEventListener('scroll', () => {
  renderList();
});

// Helpers
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return chrome.i18n.getMessage('justNow') || 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return chrome.i18n.getMessage('minutesAgo', [String(minutes)]) || `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return chrome.i18n.getMessage('hoursAgo', [String(hours)]) || `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return chrome.i18n.getMessage('daysAgo', [String(days)]) || `${days}d ago`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auto-refresh every 3 seconds
refreshInterval = setInterval(loadItems, 3000);

// Init
loadItems();
