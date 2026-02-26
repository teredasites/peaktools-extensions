import { applyI18n } from '../shared/i18n';

// Types — match ClipboardEntry from shared/types.ts
interface ClipItem {
  id: string;
  content: string;
  preview: string;
  contentType: string;
  timestamp: number;
  pinned: boolean;
  sourceUrl?: string;
  sourceDomain?: string;
  sourceTitle?: string;
  wordCount?: number;
  charCount?: number;
  tags?: string[];
  collection?: string | null;
  citation?: string | null;
  pdfCleaned?: boolean;
  html?: string | null;
}

interface CollectionItem {
  id: string;
  name: string;
  color: string;
  itemCount: number;
  isProject: boolean;
  autoCaptureDomains: string[];
  description: string;
}

// State
let allItems: ClipItem[] = [];
let filteredItems: ClipItem[] = [];
let collections: CollectionItem[] = [];
let selectedIndex = -1;
let currentFilter = 'all';
let currentCollectionFilter = '';
let searchQuery = '';
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let activeProjectId: string | null = null;
let projectFormDomains: string[] = [];
let projectFormColor = '#3b82f6';
let editingProjectId: string | null = null;

// DOM Refs
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const clipList = document.getElementById('clip-list') as HTMLDivElement;
const detailPanel = document.getElementById('detail-panel') as HTMLDivElement;
const detailBack = document.getElementById('detail-back') as HTMLButtonElement;
const detailCopy = document.getElementById('detail-copy') as HTMLButtonElement;
const detailCopyCitation = document.getElementById('detail-copy-citation') as HTMLButtonElement;
const detailPin = document.getElementById('detail-pin') as HTMLButtonElement;
const detailDelete = document.getElementById('detail-delete') as HTMLButtonElement;
const detailOpenUrl = document.getElementById('detail-open-url') as HTMLButtonElement;
const detailCopyUrl = document.getElementById('detail-copy-url') as HTMLButtonElement;
const detailContent = document.getElementById('detail-content') as HTMLDivElement;
const detailCitation = document.getElementById('detail-citation') as HTMLDivElement;
const detailMeta = document.getElementById('detail-meta') as HTMLDivElement;
const detailCollectionSelect = document.getElementById('detail-collection-select') as HTMLSelectElement;
const detailTags = document.getElementById('detail-tags') as HTMLDivElement;
const itemCountEl = document.getElementById('item-count') as HTMLSpanElement;
const clearAllBtn = document.getElementById('clear-all') as HTMLButtonElement;
const filterChips = document.querySelectorAll('.filter-chip') as NodeListOf<HTMLButtonElement>;
const collectionFilter = document.getElementById('collection-filter') as HTMLSelectElement;
const addItemBtn = document.getElementById('add-item') as HTMLButtonElement;
const addOverlay = document.getElementById('add-overlay') as HTMLDivElement;
const addOverlayClose = document.getElementById('add-overlay-close') as HTMLButtonElement;
const addInput = document.getElementById('add-input') as HTMLTextAreaElement;
const addSaveBtn = document.getElementById('add-save') as HTMLButtonElement;
const addTypeHint = document.getElementById('add-type-hint') as HTMLSpanElement;
const addTypeSelect = document.getElementById('add-type-select') as HTMLSelectElement;

// Sub-action bars
const urlSubActions = document.getElementById('url-sub-actions') as HTMLDivElement;
const codeSubActions = document.getElementById('code-sub-actions') as HTMLDivElement;
const openAllUrlsBtn = document.getElementById('open-all-urls') as HTMLButtonElement;
const copyAllUrlsBtn = document.getElementById('copy-all-urls') as HTMLButtonElement;
const copyAllCodeBtn = document.getElementById('copy-all-code') as HTMLButtonElement;

// Upgrade banner
const upgradeBanner = document.getElementById('upgrade-banner') as HTMLDivElement;
const upgradeBannerMsg = document.getElementById('upgrade-banner-msg') as HTMLSpanElement;
const upgradeBannerBtn = document.getElementById('upgrade-banner-btn') as HTMLButtonElement;
const upgradeBannerClose = document.getElementById('upgrade-banner-close') as HTMLButtonElement;

// Projects
const projectsPanel = document.getElementById('projects-panel') as HTMLDivElement;
const projectsList = document.getElementById('projects-list') as HTMLDivElement;
const newProjectBtn = document.getElementById('new-project-btn') as HTMLButtonElement;
const projectDetail = document.getElementById('project-detail') as HTMLDivElement;
const projectBack = document.getElementById('project-back') as HTMLButtonElement;
const projectExportTxt = document.getElementById('project-export-txt') as HTMLButtonElement;
const projectExportHtml = document.getElementById('project-export-html') as HTMLButtonElement;
const projectEditBtn = document.getElementById('project-edit') as HTMLButtonElement;
const projectDeleteBtn = document.getElementById('project-delete-btn') as HTMLButtonElement;
const projectDetailInfo = document.getElementById('project-detail-info') as HTMLDivElement;
const projectItemsList = document.getElementById('project-items-list') as HTMLDivElement;

// Project overlay
const projectOverlay = document.getElementById('project-overlay') as HTMLDivElement;
const projectOverlayClose = document.getElementById('project-overlay-close') as HTMLButtonElement;
const projectNameInput = document.getElementById('project-name-input') as HTMLInputElement;
const projectDescInput = document.getElementById('project-desc-input') as HTMLInputElement;
const domainChips = document.getElementById('domain-chips') as HTMLDivElement;
const domainInput = document.getElementById('domain-input') as HTMLInputElement;
const colorPicker = document.getElementById('color-picker') as HTMLDivElement;
const projectSaveBtn = document.getElementById('project-save') as HTMLButtonElement;

// Virtual Scrolling
const ITEM_HEIGHT = 62;
const BUFFER_SIZE = 5;

const COLLECTION_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#64748b',
];

// ─── Language Detection ───

function detectLanguageLabel(content: string): string {
  const trimmed = content.trim();
  // JS/TS
  if (/\b(const|let|var|function|=>|import\s+.*from|export\s+(default|const|function|class)|interface\s+\w+|type\s+\w+\s*=)/m.test(trimmed)) return 'JS';
  // Python
  if (/^(def |class |import |from .+ import|if __name__|print\(|@\w+)/m.test(trimmed)) return 'Python';
  // CSS/SCSS
  if (/^[.#@]?[a-z_-][\w-]*\s*\{[\s\S]*\}/im.test(trimmed) && /:\s*[^;]+;/m.test(trimmed)) return 'CSS';
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/im.test(trimmed)) return 'SQL';
  // Shell
  if (/^(#!\/bin\/(bash|sh|zsh)|(\$|>) |sudo |npm |npx |yarn |pip |git |docker |curl |wget )/m.test(trimmed)) return 'Shell';
  // JSON
  if (/^\s*[\[{]/.test(trimmed) && /[\]}]\s*$/.test(trimmed)) {
    try { JSON.parse(trimmed); return 'JSON'; } catch { /* not JSON */ }
  }
  // HTML/XML
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|img|table|form|input|script|style)\b/i.test(trimmed)) return 'HTML';
  // Go
  if (/^(package |func |import \(|type \w+ struct)/m.test(trimmed)) return 'Go';
  // Rust
  if (/^(fn |use |mod |pub |impl |struct |enum |let mut )/m.test(trimmed)) return 'Rust';
  // Java/C#
  if (/^(public |private |protected |class |static |void |package |namespace |using )/m.test(trimmed)) return 'Java';
  // C/C++
  if (/^(#include|int main|void |char \*|printf\(|std::)/m.test(trimmed)) return 'C/C++';
  // Ruby
  if (/^(require |def |class |module |end$|puts )/m.test(trimmed)) return 'Ruby';
  // PHP
  if (/^(<\?php|\$\w+\s*=|function\s+\w+\s*\()/m.test(trimmed)) return 'PHP';
  return 'Code';
}

// ─── Upgrade Banner ───

function showUpgradeBanner(message: string): void {
  upgradeBannerMsg.textContent = message;
  upgradeBanner.classList.remove('hidden');
}

function hideUpgradeBanner(): void {
  upgradeBanner.classList.add('hidden');
}

upgradeBannerBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', payload: { plan: 'monthly' } });
});

upgradeBannerClose.addEventListener('click', hideUpgradeBanner);

// ─── Sub-action bar handlers ───

function updateSubActions(): void {
  urlSubActions.classList.add('hidden');
  codeSubActions.classList.add('hidden');
  if (currentFilter === 'url' && filteredItems.length > 0) {
    urlSubActions.classList.remove('hidden');
  } else if (currentFilter === 'code' && filteredItems.length > 0) {
    codeSubActions.classList.remove('hidden');
  }
}

openAllUrlsBtn.addEventListener('click', () => {
  const urls = filteredItems
    .filter((i) => i.contentType === 'url')
    .slice(0, 20) // Safety cap
    .map((i) => i.content);
  for (const url of urls) {
    chrome.tabs.create({ url, active: false });
  }
});

copyAllUrlsBtn.addEventListener('click', async () => {
  const urls = filteredItems
    .filter((i) => i.contentType === 'url')
    .map((i) => i.content)
    .join('\n');
  try {
    await navigator.clipboard.writeText(urls);
    copyAllUrlsBtn.textContent = 'Copied!';
    setTimeout(() => { copyAllUrlsBtn.textContent = 'Copy All URLs'; }, 1500);
  } catch { /* */ }
});

copyAllCodeBtn.addEventListener('click', async () => {
  const code = filteredItems
    .filter((i) => i.contentType === 'code')
    .map((i) => i.content)
    .join('\n\n// ───\n\n');
  try {
    await navigator.clipboard.writeText(code);
    copyAllCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyAllCodeBtn.textContent = 'Copy All Snippets'; }, 1500);
  } catch { /* */ }
});

// ─── Empty State ───

function getEmptyStateMessage(): { icon: string; text: string; hint: string } {
  switch (currentFilter) {
    case 'url':
      return {
        icon: '&#128279;',
        text: chrome.i18n.getMessage('emptyUrlText') || 'No URLs saved yet',
        hint: chrome.i18n.getMessage('emptyUrlHint') || 'Copy any URL from your browser to save it here, or click + Add below.',
      };
    case 'code':
      return {
        icon: '&#128187;',
        text: chrome.i18n.getMessage('emptyCodeText') || 'No code snippets yet',
        hint: chrome.i18n.getMessage('emptyCodeHint') || 'Copy code from any editor or website to save it here.',
      };
    case 'text':
      return {
        icon: '&#128196;',
        text: chrome.i18n.getMessage('emptyTextText') || 'No text clips yet',
        hint: chrome.i18n.getMessage('emptyTextHint') || 'Copy text from any page to start building your history.',
      };
    case 'pinned':
      return {
        icon: '&#128204;',
        text: chrome.i18n.getMessage('emptyPinnedText') || 'No pinned items',
        hint: chrome.i18n.getMessage('emptyPinnedHint') || 'Open any item and click Pin to keep it at the top.',
      };
    default:
      return {
        icon: '&#128203;',
        text: chrome.i18n.getMessage('noHistory') || 'No clipboard items',
        hint: chrome.i18n.getMessage('emptyDefaultHint') || 'Copy anything on the web — it shows up here automatically.',
      };
  }
}

// ─── Render: Type-Specific List Items ───

function renderUrlItem(item: ClipItem, globalIdx: number, coll: CollectionItem | null | undefined): string {
  // Extract domain from the URL content
  let displayDomain = '';
  try {
    displayDomain = new URL(item.content).hostname.replace(/^www\./, '');
  } catch {
    displayDomain = item.content.slice(0, 40);
  }
  const pageTitle = item.sourceTitle || item.preview || '';

  return `
    <div class="clip-item clip-url ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
      <div class="item-top">
        ${coll ? `<span class="collection-badge" style="background:${coll.color}" title="${escapeHtml(coll.name)}"></span>` : ''}
        ${item.pinned ? '<span class="pin-indicator">&#128204;</span>' : ''}
        <span class="item-domain">${escapeHtml(displayDomain)}</span>
        <span class="type-badge">URL</span>
        <div class="url-actions">
          <button class="open-url-btn" data-url="${escapeHtml(item.content)}" title="Open URL">Open</button>
          <button class="copy-url-btn" data-url="${escapeHtml(item.content)}" title="Copy URL">Copy</button>
        </div>
      </div>
      <div class="meta">
        <span class="item-page-title">${escapeHtml(pageTitle.length > 60 ? pageTitle.slice(0, 60) + '...' : pageTitle)}</span>
      </div>
      <div class="meta">
        <span class="time">${timeAgo(item.timestamp)}</span>
      </div>
    </div>
  `;
}

function renderCodeItem(item: ClipItem, globalIdx: number, coll: CollectionItem | null | undefined): string {
  const lang = detectLanguageLabel(item.content);
  const lineCount = item.content.split('\n').length;

  return `
    <div class="clip-item clip-code ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
      <div class="item-top">
        ${coll ? `<span class="collection-badge" style="background:${coll.color}" title="${escapeHtml(coll.name)}"></span>` : ''}
        ${item.pinned ? '<span class="pin-indicator">&#128204;</span>' : ''}
        <span class="preview">${escapeHtml(item.preview)}</span>
        <span class="lang-badge">${lang}</span>
      </div>
      <div class="meta">
        <span class="time">${timeAgo(item.timestamp)}</span>
        <span class="line-count">${lineCount} line${lineCount !== 1 ? 's' : ''}</span>
        ${item.sourceDomain && item.sourceDomain !== 'manual' ? `<span class="source" ${item.sourceUrl ? `data-url="${escapeHtml(item.sourceUrl)}"` : ''}>${item.sourceDomain}</span>` : ''}
      </div>
    </div>
  `;
}

function renderDefaultItem(item: ClipItem, globalIdx: number, coll: CollectionItem | null | undefined): string {
  return `
    <div class="clip-item ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
      <div class="item-top">
        ${coll ? `<span class="collection-badge" style="background:${coll.color}" title="${escapeHtml(coll.name)}"></span>` : ''}
        ${item.pinned ? '<span class="pin-indicator">&#128204;</span>' : ''}
        <span class="preview">${escapeHtml(item.preview)}</span>
        ${item.pdfCleaned ? '<span class="pdf-badge">PDF</span>' : ''}
        <span class="type-badge">${item.contentType}</span>
      </div>
      <div class="meta">
        <span class="time">${timeAgo(item.timestamp)}</span>
        ${item.wordCount ? `<span class="word-count">${chrome.i18n.getMessage('words', [String(item.wordCount)]) || item.wordCount + ' words'}</span>` : ''}
        ${item.sourceDomain && item.sourceDomain !== 'manual' ? `<span class="source" ${item.sourceUrl ? `data-url="${escapeHtml(item.sourceUrl)}" title="${escapeHtml(item.sourceUrl)}"` : ''}>${item.sourceDomain}</span>` : ''}
      </div>
    </div>
  `;
}

// ─── Main Render ───

function renderList(): void {
  if (filteredItems.length === 0) {
    const empty = getEmptyStateMessage();
    clipList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${empty.icon}</div>
        <div class="empty-text">${empty.text}</div>
        <div class="empty-hint">${empty.hint}</div>
      </div>
    `;
    itemCountEl.textContent = chrome.i18n.getMessage('items', ['0']) || '0 items';
    updateSubActions();
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
            const coll = item.collection ? collections.find((c) => c.id === item.collection) : null;

            if (item.contentType === 'url') {
              return renderUrlItem(item, globalIdx, coll);
            } else if (item.contentType === 'code') {
              return renderCodeItem(item, globalIdx, coll);
            } else {
              return renderDefaultItem(item, globalIdx, coll);
            }
          }).join('')}
        </div>
      </div>
    </div>
  `;

  itemCountEl.textContent = chrome.i18n.getMessage('items', [String(filteredItems.length)]) || `${filteredItems.length} items`;
  updateSubActions();

  // Click handlers
  clipList.querySelectorAll('.clip-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Open URL button
      const openBtn = target.closest('.open-url-btn') as HTMLElement;
      if (openBtn && openBtn.dataset.url) {
        e.stopPropagation();
        chrome.tabs.create({ url: openBtn.dataset.url });
        return;
      }
      // Copy URL button
      const copyBtn = target.closest('.copy-url-btn') as HTMLElement;
      if (copyBtn && copyBtn.dataset.url) {
        e.stopPropagation();
        navigator.clipboard.writeText(copyBtn.dataset.url).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        });
        return;
      }
      const index = parseInt((el as HTMLElement).dataset.index || '0', 10);
      openDetail(index);
    });
  });
}

// ─── Detail Panel: Type-Specific ───

function openDetail(index: number): void {
  if (index < 0 || index >= filteredItems.length) return;
  selectedIndex = index;
  const item = filteredItems[index];

  // Reset detail content class
  detailContent.className = 'detail-content';

  if (item.contentType === 'code') {
    // Code: monospace pre block
    const lang = detectLanguageLabel(item.content);
    detailContent.className = 'detail-content-code';
    detailContent.textContent = item.content;

    // Insert language label before content
    const existingLangLabel = detailPanel.querySelector('.detail-lang-label');
    if (existingLangLabel) existingLangLabel.remove();
    const langLabel = document.createElement('div');
    langLabel.className = 'detail-lang-label';
    langLabel.textContent = lang;
    detailContent.parentElement!.insertBefore(langLabel, detailContent);
  } else if (item.contentType === 'url') {
    // URL: clickable link display
    detailContent.innerHTML = '';
    const urlContainer = document.createElement('div');
    urlContainer.className = 'detail-url-display';
    const urlLink = document.createElement('a');
    urlLink.className = 'detail-url-link';
    urlLink.textContent = item.content;
    urlLink.href = '#';
    urlLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: item.content });
    });
    urlContainer.appendChild(urlLink);
    detailContent.appendChild(urlContainer);

    // Remove any leftover lang label
    const existingLangLabel = detailPanel.querySelector('.detail-lang-label');
    if (existingLangLabel) existingLangLabel.remove();
  } else {
    // Text/email/html: normal pre-wrap text
    detailContent.textContent = item.content;

    // Remove any leftover lang label
    const existingLangLabel = detailPanel.querySelector('.detail-lang-label');
    if (existingLangLabel) existingLangLabel.remove();
  }

  // Citation display
  if (item.citation) {
    detailCitation.textContent = item.citation;
    detailCitation.classList.remove('hidden');
    detailCopyCitation.style.display = '';
  } else {
    detailCitation.classList.add('hidden');
    detailCopyCitation.style.display = 'none';
  }

  // Meta info
  const sourceLink = item.sourceUrl
    ? `<a href="#" class="source-link" data-url="${escapeHtml(item.sourceUrl)}" title="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.sourceDomain || item.sourceUrl)}</a>`
    : (item.sourceDomain ? escapeHtml(item.sourceDomain) : '');

  if (item.contentType === 'code') {
    const lineCount = item.content.split('\n').length;
    const lang = detectLanguageLabel(item.content);
    detailMeta.innerHTML = `
      <div>${lang} &bull; ${lineCount} line${lineCount !== 1 ? 's' : ''} &bull; ${timeAgo(item.timestamp)}</div>
      ${sourceLink ? `<div>Source: ${sourceLink}</div>` : ''}
    `;
  } else if (item.contentType === 'url') {
    let displayDomain = '';
    try { displayDomain = new URL(item.content).hostname; } catch { displayDomain = ''; }
    detailMeta.innerHTML = `
      <div>URL &bull; ${escapeHtml(displayDomain)} &bull; ${timeAgo(item.timestamp)}</div>
      ${item.sourceUrl && item.sourceUrl !== item.content ? `<div>Source: ${sourceLink}</div>` : ''}
    `;
  } else {
    detailMeta.innerHTML = `
      <div>${item.contentType} &bull; ${timeAgo(item.timestamp)} &bull; ${chrome.i18n.getMessage('words', [String(item.wordCount || 0)]) || (item.wordCount || 0) + ' words'}${item.pdfCleaned ? ' &bull; PDF cleaned' : ''}</div>
      ${sourceLink ? `<div>Source: ${sourceLink}</div>` : ''}
    `;
  }

  // Wire up source links
  detailMeta.querySelectorAll('.source-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = (link as HTMLElement).dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });

  // Show/hide URL-specific buttons
  if (item.contentType === 'url') {
    detailOpenUrl.classList.remove('hidden');
    detailOpenUrl.dataset.url = item.content;
    detailOpenUrl.textContent = 'Open in New Tab';
    detailCopyUrl.classList.remove('hidden');
    detailCopyUrl.dataset.url = item.content;
  } else {
    // Show Open for source URL if available
    if (item.sourceUrl) {
      detailOpenUrl.classList.remove('hidden');
      detailOpenUrl.dataset.url = item.sourceUrl;
      detailOpenUrl.textContent = 'Open';
    } else {
      detailOpenUrl.classList.add('hidden');
      detailOpenUrl.dataset.url = '';
    }
    detailCopyUrl.classList.add('hidden');
  }

  // Collection select
  populateCollectionSelect(detailCollectionSelect, item.collection ?? '');

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
  // Clean up any lang label
  const existingLangLabel = detailPanel.querySelector('.detail-lang-label');
  if (existingLangLabel) existingLangLabel.remove();
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

  // Apply collection filter
  if (currentCollectionFilter) {
    items = items.filter((i) => i.collection === currentCollectionFilter);
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

    // Check capacity for free-tier upgrade prompt
    checkCapacityWarning();

    applyFilter();
  } catch {
    allItems = [];
    applyFilter();
  }
}

async function checkCapacityWarning(): Promise<void> {
  try {
    const proRes = await chrome.runtime.sendMessage({ type: 'GET_PRO_STATUS', payload: {} });
    const pro = proRes as { isPro: boolean } | null;
    if (!pro?.isPro && allItems.length >= 450) {
      showUpgradeBanner(`${allItems.length}/500 clips used. Upgrade for 100,000 clips.`);
    }
  } catch { /* */ }
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
    const filter = chip.dataset.filter || 'all';

    if (filter === 'projects') {
      // Toggle projects panel
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = 'projects';
      showProjectsPanel();
      return;
    }

    filterChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = filter;
    hideProjectsPanel();
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
    if (!projectOverlay.classList.contains('hidden')) {
      projectOverlay.classList.add('hidden');
    } else if (!addOverlay.classList.contains('hidden')) {
      addOverlay.classList.add('hidden');
    } else if (!detailPanel.classList.contains('hidden')) {
      closeDetail();
    } else if (!projectDetail.classList.contains('hidden')) {
      closeProjectDetail();
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
    const settings = await chrome.storage.sync.get('copyunlock_settings');
    const pasteFormat = settings?.copyunlock_settings?.defaultPasteFormat;
    if (pasteFormat && pasteFormat !== 'plain') {
      await chrome.runtime.sendMessage({ type: 'PASTE_ITEM', payload: { id: item.id, format: pasteFormat } });
    } else {
      await chrome.runtime.sendMessage({ type: 'COPY_ITEM', payload: { id: item.id } });
    }
    detailCopy.textContent = chrome.i18n.getMessage('copied') || 'Copied!';
    setTimeout(() => {
      detailCopy.textContent = chrome.i18n.getMessage('copy') || 'Copy';
    }, 1500);
  } catch { /* */ }
});

// Copy URL button in detail
detailCopyUrl.addEventListener('click', async () => {
  const url = detailCopyUrl.dataset.url;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    detailCopyUrl.textContent = 'Copied!';
    setTimeout(() => { detailCopyUrl.textContent = 'Copy URL'; }, 1500);
  } catch { /* */ }
});

detailPin.addEventListener('click', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PIN_CLIPBOARD_ITEM',
      payload: { id: item.id, pinned: !item.pinned },
    });
    // Check for limit error
    const res = response as { ok?: boolean; error?: string } | null;
    if (res && res.ok === false && res.error) {
      showUpgradeBanner(res.error);
      return;
    }
    item.pinned = !item.pinned;
    detailPin.textContent = item.pinned
      ? (chrome.i18n.getMessage('unpin') || 'Unpin')
      : (chrome.i18n.getMessage('pin') || 'Pin');
    renderList();
  } catch { /* */ }
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
  } catch { /* */ }
});

// Open URL
detailOpenUrl.addEventListener('click', () => {
  const url = detailOpenUrl.dataset.url;
  if (url) chrome.tabs.create({ url });
});

// Clear all
clearAllBtn.addEventListener('click', async () => {
  const msg = chrome.i18n.getMessage('clearConfirm') || 'Clear all clipboard history?';
  if (!confirm(msg)) return;
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_CLIPBOARD', payload: {} });
    allItems = [];
    applyFilter();
  } catch { /* */ }
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

// ─── Collections ───

async function loadCollections(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_COLLECTIONS',
      payload: {},
    });
    collections = Array.isArray(response) ? response : [];
    populateCollectionFilter();
  } catch {
    collections = [];
  }
}

function populateCollectionFilter(): void {
  const current = collectionFilter.value;
  collectionFilter.innerHTML = `<option value="">${chrome.i18n.getMessage('allCollections') || 'All Collections'}</option>`;
  for (const c of collections) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.isProject ? '📁 ' : ''}${c.name} (${c.itemCount})`;
    opt.style.color = c.color;
    collectionFilter.appendChild(opt);
  }
  collectionFilter.value = current;
}

function populateCollectionSelect(select: HTMLSelectElement, currentValue: string): void {
  select.innerHTML = `<option value="">${chrome.i18n.getMessage('none') || 'None'}</option>`;
  for (const c of collections) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.isProject ? '📁 ' : ''}${c.name}`;
    select.appendChild(opt);
  }
  select.value = currentValue;
}

collectionFilter.addEventListener('change', () => {
  currentCollectionFilter = collectionFilter.value;
  applyFilter();
});

// Detail: copy with citation
detailCopyCitation.addEventListener('click', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  try {
    await chrome.runtime.sendMessage({
      type: 'PASTE_ITEM',
      payload: { id: item.id, format: 'with-citation' },
    });
    detailCopyCitation.textContent = chrome.i18n.getMessage('copied') || 'Copied!';
    setTimeout(() => {
      detailCopyCitation.textContent = chrome.i18n.getMessage('cite') || '+ Cite';
    }, 1500);
  } catch { /* */ }
});

// Detail: assign collection
detailCollectionSelect.addEventListener('change', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  const collectionId = detailCollectionSelect.value || null;
  try {
    await chrome.runtime.sendMessage({
      type: 'SET_ITEM_COLLECTION',
      payload: { itemId: item.id, collectionId },
    });
    item.collection = collectionId;
    loadCollections();
    renderList();
  } catch { /* */ }
});

// ─── Add Item ───

function detectTypeLabel(text: string): string {
  const trimmed = text.trim();
  const lines = trimmed.split('\n');

  // URLs
  if (/^https?:\/\/\S+$/i.test(trimmed)) return 'url';
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+\/?(\S*)$/i.test(trimmed)) return 'url';
  if (lines.length >= 2 && lines.length <= 50 && lines.every((l) => /^\s*(https?:\/\/\S+)\s*$/i.test(l))) return 'url';
  if (trimmed.length <= 200 && lines.length === 1 && /https?:\/\/\S{8,}/i.test(trimmed)) return 'url';
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,}){1,3}$/i.test(trimmed)) return 'url';

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';

  // Code
  if (/^(function|const|let|var|class|import|export|interface|type|enum|if|for|while|return|async|await|switch|case|try|catch|throw|new)\b/m.test(trimmed)) return 'code';
  if (/^(def |class |import |from |if |elif |else:|for |while |try:|except |with |lambda )/m.test(trimmed)) return 'code';
  if (/^[.#@]?[a-z_-][\w-]*\s*\{[\s\S]*\}/im.test(trimmed)) return 'code';
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/im.test(trimmed)) return 'code';
  if (/^(\$|>|#!\/|sudo |npm |npx |yarn |pip |git |docker |curl |wget |brew |apt )/m.test(trimmed)) return 'code';
  if (/^\s*[\[{]/.test(trimmed) && /[\]}]\s*$/.test(trimmed) && lines.length >= 2) return 'code';
  const assignLines = lines.filter((l) => /^\s*\w+\s*[:=]/.test(l)).length;
  if (assignLines >= 3 && assignLines / lines.length >= 0.5) return 'code';
  if (lines.length >= 3) {
    const indicators = [
      /[{}\[\]();]/.test(text),
      /=>|->|::|\.\.\.|\?\?|&&|\|\|/.test(text),
      lines.filter((l) => /^\s{2,}/.test(l)).length >= 2,
      lines.filter((l) => /;\s*$/.test(l)).length >= 2,
      lines.filter((l) => /^\s*(\/\/|#|\/\*|\*|---)/.test(l)).length >= 1,
      /!==?|===?/.test(text),
    ];
    if (indicators.filter(Boolean).length >= 3) return 'code';
  }
  if (/^(function\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|\(\)\s*=>|console\.\w+\(|document\.\w+\(|window\.\w+\()/.test(trimmed)) return 'code';
  if (/^(\/[\w.-]+){2,}$/.test(trimmed) || /^[A-Z]:\\[\w\\.-]+$/i.test(trimmed)) return 'code';

  // HTML
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|img|table|form|input|script|style)\b[\s\S]*>/i.test(trimmed)) return 'html';
  if ((trimmed.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length >= 2) return 'html';

  return 'text';
}

addItemBtn.addEventListener('click', () => {
  addInput.value = '';
  addTypeHint.textContent = 'text';
  addTypeSelect.value = 'auto';
  addOverlay.classList.remove('hidden');
  addInput.focus();
});

addOverlayClose.addEventListener('click', () => {
  addOverlay.classList.add('hidden');
});

addInput.addEventListener('input', () => {
  const detected = detectTypeLabel(addInput.value);
  addTypeHint.textContent = detected;
  if (addTypeSelect.value === 'auto') {
    addTypeHint.textContent = detected;
  }
});

addTypeSelect.addEventListener('change', () => {
  if (addTypeSelect.value !== 'auto') {
    addTypeHint.textContent = addTypeSelect.value;
  } else {
    addTypeHint.textContent = detectTypeLabel(addInput.value);
  }
});

addSaveBtn.addEventListener('click', async () => {
  const content = addInput.value.trim();
  if (!content) return;

  addSaveBtn.textContent = chrome.i18n.getMessage('saving') || 'Saving...';
  addSaveBtn.disabled = true;

  const chosenType = addTypeSelect.value !== 'auto' ? addTypeSelect.value : undefined;

  try {
    await chrome.runtime.sendMessage({
      type: 'CLIPBOARD_CAPTURE',
      payload: {
        content,
        html: null,
        sourceUrl: 'manual://sidepanel',
        sourceTitle: 'Manual Add',
        wasUnlocked: false,
        watermarkStripped: false,
        contentTypeOverride: chosenType,
      },
    });
    addOverlay.classList.add('hidden');
    addInput.value = '';
    loadItems();
  } catch { /* */ }

  addSaveBtn.textContent = chrome.i18n.getMessage('save') || 'Save';
  addSaveBtn.disabled = false;
});

// Close overlay on Escape
addOverlay.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') addOverlay.classList.add('hidden');
});

// Make source domain clickable in list
clipList.addEventListener('click', (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('source') && target.dataset.url) {
    e.stopPropagation();
    chrome.tabs.create({ url: target.dataset.url });
  }
});

// ─── Projects Panel ───

function showProjectsPanel(): void {
  clipList.classList.add('hidden');
  projectsPanel.classList.remove('hidden');
  projectDetail.classList.add('hidden');
  urlSubActions.classList.add('hidden');
  codeSubActions.classList.add('hidden');
  renderProjectsList();
}

function hideProjectsPanel(): void {
  clipList.classList.remove('hidden');
  projectsPanel.classList.add('hidden');
  projectDetail.classList.add('hidden');
}

function renderProjectsList(): void {
  const projects = collections.filter((c) => c.isProject);

  if (projects.length === 0) {
    projectsList.innerHTML = `
      <div class="projects-empty">
        <div class="projects-empty-icon">&#128194;</div>
        <div class="projects-empty-text">No projects yet</div>
        <div class="projects-empty-hint">Projects auto-file clips from specific domains. Click "+ New Project" to get started.</div>
      </div>
    `;
    return;
  }

  projectsList.innerHTML = projects.map((p) => `
    <div class="project-card" data-project-id="${p.id}">
      <div class="project-card-top">
        <span class="project-color-dot" style="background:${p.color}"></span>
        <span class="project-card-name">${escapeHtml(p.name)}</span>
        <span class="project-card-count">${p.itemCount} item${p.itemCount !== 1 ? 's' : ''}</span>
      </div>
      ${p.description ? `<div class="project-card-desc">${escapeHtml(p.description)}</div>` : ''}
      ${p.autoCaptureDomains.length > 0 ? `
        <div class="project-card-domains">
          ${p.autoCaptureDomains.map((d) => `<span class="domain-badge">${escapeHtml(d)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  // Click handlers
  projectsList.querySelectorAll('.project-card').forEach((el) => {
    el.addEventListener('click', () => {
      const projectId = (el as HTMLElement).dataset.projectId;
      if (projectId) openProjectDetail(projectId);
    });
  });
}

async function openProjectDetail(projectId: string): Promise<void> {
  activeProjectId = projectId;
  const project = collections.find((c) => c.id === projectId);
  if (!project) return;

  projectDetailInfo.innerHTML = `
    <div class="project-detail-name">
      <span class="project-color-dot" style="background:${project.color}; display:inline-block; vertical-align:middle; margin-right:6px;"></span>
      ${escapeHtml(project.name)}
    </div>
    ${project.description ? `<div class="project-detail-desc">${escapeHtml(project.description)}</div>` : ''}
    ${project.autoCaptureDomains.length > 0 ? `
      <div class="project-card-domains" style="margin-top:6px;">
        ${project.autoCaptureDomains.map((d) => `<span class="domain-badge">${escapeHtml(d)}</span>`).join('')}
      </div>
    ` : ''}
  `;

  // Load project items
  const projectItems = allItems.filter((i) => i.collection === projectId);
  if (projectItems.length === 0) {
    projectItemsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128194;</div>
        <div class="empty-text">No items in this project yet</div>
        <div class="empty-hint">Copy content from ${project.autoCaptureDomains.length > 0 ? project.autoCaptureDomains.join(', ') : 'your assigned domains'} to auto-file here.</div>
      </div>
    `;
  } else {
    projectItemsList.innerHTML = projectItems.map((item, i) => {
      const coll = null; // Already in the project, no need for badge
      if (item.contentType === 'url') return renderUrlItem(item, i, coll);
      if (item.contentType === 'code') return renderCodeItem(item, i, coll);
      return renderDefaultItem(item, i, coll);
    }).join('');

    // Click handler for project items
    projectItemsList.querySelectorAll('.clip-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const openBtn = target.closest('.open-url-btn') as HTMLElement;
        if (openBtn && openBtn.dataset.url) {
          e.stopPropagation();
          chrome.tabs.create({ url: openBtn.dataset.url });
          return;
        }
        const copyBtn = target.closest('.copy-url-btn') as HTMLElement;
        if (copyBtn && copyBtn.dataset.url) {
          e.stopPropagation();
          navigator.clipboard.writeText(copyBtn.dataset.url).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
          });
          return;
        }
        // Open detail from project items - find in allItems
        const itemId = (el as HTMLElement).dataset.id;
        const idx = filteredItems.findIndex((fi) => fi.id === itemId);
        if (idx >= 0) {
          openDetail(idx);
        } else {
          // Item might not be in filtered list — temporarily set filteredItems
          const allIdx = allItems.findIndex((ai) => ai.id === itemId);
          if (allIdx >= 0) {
            filteredItems = allItems;
            openDetail(allIdx);
          }
        }
      });
    });
  }

  projectsPanel.classList.add('hidden');
  projectDetail.classList.remove('hidden');
}

function closeProjectDetail(): void {
  activeProjectId = null;
  projectDetail.classList.add('hidden');
  projectsPanel.classList.remove('hidden');
  renderProjectsList();
}

projectBack.addEventListener('click', closeProjectDetail);

// Export project
projectExportTxt.addEventListener('click', async () => {
  if (!activeProjectId) return;
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'EXPORT_PROJECT',
      payload: { collectionId: activeProjectId, format: 'text' },
    }) as { content: string; filename: string } | null;
    if (result?.content) downloadFile(result.content, result.filename, 'text/plain');
  } catch { /* */ }
});

projectExportHtml.addEventListener('click', async () => {
  if (!activeProjectId) return;
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'EXPORT_PROJECT',
      payload: { collectionId: activeProjectId, format: 'html' },
    }) as { content: string; filename: string } | null;
    if (result?.content) downloadFile(result.content, result.filename, 'text/html');
  } catch { /* */ }
});

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Edit project
projectEditBtn.addEventListener('click', () => {
  if (!activeProjectId) return;
  const project = collections.find((c) => c.id === activeProjectId);
  if (!project) return;
  editingProjectId = activeProjectId;
  openProjectOverlay(project);
});

// Delete project
projectDeleteBtn.addEventListener('click', async () => {
  if (!activeProjectId) return;
  const project = collections.find((c) => c.id === activeProjectId);
  if (!project) return;
  if (!confirm(`Delete project "${project.name}"? Items will be uncategorized but not deleted.`)) return;
  try {
    await chrome.runtime.sendMessage({
      type: 'DELETE_COLLECTION',
      payload: { id: activeProjectId },
    });
    await loadCollections();
    closeProjectDetail();
  } catch { /* */ }
});

// New project button
newProjectBtn.addEventListener('click', async () => {
  // Check project limit
  const projects = collections.filter((c) => c.isProject);
  try {
    const proRes = await chrome.runtime.sendMessage({ type: 'GET_PRO_STATUS', payload: {} });
    const pro = proRes as { isPro: boolean } | null;
    const limit = pro?.isPro ? 100 : 2;
    if (projects.length >= limit) {
      showUpgradeBanner(`Project limit reached (${projects.length}/${limit}). Upgrade for more.`);
      return;
    }
  } catch { /* */ }

  editingProjectId = null;
  openProjectOverlay(null);
});

function openProjectOverlay(existing: CollectionItem | null): void {
  if (existing) {
    projectNameInput.value = existing.name;
    projectDescInput.value = existing.description || '';
    projectFormDomains = [...existing.autoCaptureDomains];
    projectFormColor = existing.color;
    projectSaveBtn.textContent = 'Save Changes';
  } else {
    projectNameInput.value = '';
    projectDescInput.value = '';
    projectFormDomains = [];
    projectFormColor = COLLECTION_COLORS[0];
    projectSaveBtn.textContent = 'Create Project';
  }
  renderDomainChips();
  renderColorPicker();
  projectOverlay.classList.remove('hidden');
  projectNameInput.focus();
}

function renderDomainChips(): void {
  domainChips.innerHTML = projectFormDomains.map((d, i) => `
    <span class="domain-chip">
      ${escapeHtml(d)}
      <button class="domain-chip-remove" data-domain-idx="${i}">&times;</button>
    </span>
  `).join('');

  domainChips.querySelectorAll('.domain-chip-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((btn as HTMLElement).dataset.domainIdx || '0', 10);
      projectFormDomains.splice(idx, 1);
      renderDomainChips();
    });
  });
}

domainInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const domain = domainInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (domain && !projectFormDomains.includes(domain)) {
      projectFormDomains.push(domain);
      renderDomainChips();
    }
    domainInput.value = '';
  }
});

function renderColorPicker(): void {
  colorPicker.innerHTML = COLLECTION_COLORS.map((color) => `
    <div class="color-swatch ${color === projectFormColor ? 'selected' : ''}"
         style="background:${color}" data-color="${color}"></div>
  `).join('');

  colorPicker.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      projectFormColor = (swatch as HTMLElement).dataset.color || COLLECTION_COLORS[0];
      renderColorPicker();
    });
  });
}

projectOverlayClose.addEventListener('click', () => {
  projectOverlay.classList.add('hidden');
});

projectOverlay.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') projectOverlay.classList.add('hidden');
});

projectSaveBtn.addEventListener('click', async () => {
  const name = projectNameInput.value.trim();
  if (!name) return;

  projectSaveBtn.disabled = true;
  projectSaveBtn.textContent = 'Saving...';

  try {
    if (editingProjectId) {
      // Update existing project
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PROJECT',
        payload: {
          id: editingProjectId,
          name,
          description: projectDescInput.value.trim(),
          autoCaptureDomains: projectFormDomains,
          color: projectFormColor,
        },
      });
    } else {
      // Create new project
      const result = await chrome.runtime.sendMessage({
        type: 'CREATE_PROJECT',
        payload: {
          name,
          description: projectDescInput.value.trim(),
          autoCaptureDomains: projectFormDomains,
          color: projectFormColor,
        },
      });
      const res = result as { ok?: boolean; error?: string } | null;
      if (res && res.ok === false && res.error) {
        showUpgradeBanner(res.error);
        projectSaveBtn.disabled = false;
        projectSaveBtn.textContent = editingProjectId ? 'Save Changes' : 'Create Project';
        return;
      }
    }

    projectOverlay.classList.add('hidden');
    await loadCollections();

    if (editingProjectId && activeProjectId === editingProjectId) {
      // Re-open project detail with updated data
      openProjectDetail(editingProjectId);
    } else {
      renderProjectsList();
    }
    editingProjectId = null;
  } catch { /* */ }

  projectSaveBtn.disabled = false;
  projectSaveBtn.textContent = editingProjectId ? 'Save Changes' : 'Create Project';
});

// Auto-refresh every 3 seconds
refreshInterval = setInterval(() => {
  loadItems();
  loadCollections();
}, 3000);

// Apply i18n translations to static HTML elements
applyI18n();

// Init
loadItems();
loadCollections();
