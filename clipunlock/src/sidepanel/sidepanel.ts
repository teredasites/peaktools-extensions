import { initI18n, applyI18n, getMessage } from '../shared/i18n';

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
let currentView: 'recent' | 'pinned' | 'projects' = 'recent';
let searchQuery = '';
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let activeProjectId: string | null = null;
let projectFormDomains: string[] = [];
let projectFormColor = '#3b82f6';
let editingProjectId: string | null = null;
let pendingItemIdForProject: string | null = null; // Item to assign after project creation (from right-click)

// Time-grouped flat list
type FlatEntry =
  | { kind: 'header'; label: string }
  | { kind: 'item'; item: ClipItem; globalIdx: number };
let flatList: FlatEntry[] = [];

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
const viewTabs = document.querySelectorAll('.view-tab') as NodeListOf<HTMLButtonElement>;
const addItemBtn = document.getElementById('add-item') as HTMLButtonElement;
const addOverlay = document.getElementById('add-overlay') as HTMLDivElement;
const addOverlayClose = document.getElementById('add-overlay-close') as HTMLButtonElement;
const addInput = document.getElementById('add-input') as HTMLTextAreaElement;
const addSaveBtn = document.getElementById('add-save') as HTMLButtonElement;
const addTypeHint = document.getElementById('add-type-hint') as HTMLSpanElement;
const addTypeSelect = document.getElementById('add-type-select') as HTMLSelectElement;

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
const projectExportPdf = document.getElementById('project-export-pdf') as HTMLButtonElement;
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
const newProjectFooterBtn = document.getElementById('new-project-footer-btn') as HTMLButtonElement;
const openSettingsBtn = document.getElementById('open-settings') as HTMLButtonElement;
const detailNewProject = document.getElementById('detail-new-project') as HTMLButtonElement;

// Settings modal refs
const settingsOverlay = document.getElementById('settings-overlay') as HTMLDivElement;
const settingsOverlayClose = document.getElementById('settings-overlay-close') as HTMLButtonElement;
const sEnabled = document.getElementById('s-enabled') as HTMLInputElement;
const sMode = document.getElementById('s-mode') as HTMLSelectElement;
const sNotifications = document.getElementById('s-notifications') as HTMLInputElement;
const sContextMenu = document.getElementById('s-context-menu') as HTMLInputElement;
const sClipboard = document.getElementById('s-clipboard') as HTMLInputElement;
const sMaxItems = document.getElementById('s-max-items') as HTMLInputElement;
const sRetention = document.getElementById('s-retention') as HTMLInputElement;
const sWatermark = document.getElementById('s-watermark') as HTMLInputElement;
const sCitation = document.getElementById('s-citation') as HTMLSelectElement;
const sPasteFormat = document.getElementById('s-paste-format') as HTMLSelectElement;
const sPdfCleanup = document.getElementById('s-pdf-cleanup') as HTMLInputElement;
const sProStatusLabel = document.getElementById('s-pro-status-label') as HTMLSpanElement;
const sUpgradeBtn = document.getElementById('s-upgrade-btn') as HTMLButtonElement;
const sFullSettings = document.getElementById('s-full-settings') as HTMLButtonElement;
const sManageRow = document.getElementById('s-manage-row') as HTMLDivElement;
const sManageSubBtn = document.getElementById('s-manage-sub-btn') as HTMLButtonElement;

// Site overrides refs
const sOverridesList = document.getElementById('s-overrides-list') as HTMLDivElement;
const sOverrideDomain = document.getElementById('s-override-domain') as HTMLInputElement;
const sOverrideMode = document.getElementById('s-override-mode') as HTMLSelectElement;
const sAddOverride = document.getElementById('s-add-override') as HTMLButtonElement;

// Language selector ref
const sLanguage = document.getElementById('s-language') as HTMLSelectElement;

// Keyboard shortcuts
const sConfigureShortcuts = document.getElementById('s-configure-shortcuts') as HTMLAnchorElement;

// Pro details refs
const sProActiveInfo = document.getElementById('s-pro-active-info') as HTMLDivElement;
const sProPlanName = document.getElementById('s-pro-plan-name') as HTMLElement;
const sProRenewsAt = document.getElementById('s-pro-renews-at') as HTMLSpanElement;
const sRefreshLicense = document.getElementById('s-refresh-license') as HTMLButtonElement;
const sRefreshLicenseFree = document.getElementById('s-refresh-license-free') as HTMLButtonElement;
const sProUpgradeSection = document.getElementById('s-pro-upgrade-section') as HTMLDivElement;
const sPlanCards = document.querySelectorAll('.s-plan-card') as NodeListOf<HTMLButtonElement>;

// Export/Import refs
const sExportData = document.getElementById('s-export-data') as HTMLButtonElement;
const sImportData = document.getElementById('s-import-data') as HTMLButtonElement;
const sImportFile = document.getElementById('s-import-file') as HTMLInputElement;

// Stats refs
const sStatUnlocks = document.getElementById('s-stat-unlocks') as HTMLSpanElement;
const sStatCopies = document.getElementById('s-stat-copies') as HTMLSpanElement;
const sStatWatermarks = document.getElementById('s-stat-watermarks') as HTMLSpanElement;

// Version ref
const sVersion = document.getElementById('s-version') as HTMLSpanElement;

// Clear data modal refs
const clearOverlay = document.getElementById('clear-overlay') as HTMLDivElement;
const clearOverlayClose = document.getElementById('clear-overlay-close') as HTMLButtonElement;
const clearHistory = document.getElementById('clear-history') as HTMLInputElement;
const clearPinned = document.getElementById('clear-pinned') as HTMLInputElement;
const clearProjects = document.getElementById('clear-projects') as HTMLInputElement;
const clearCancelBtn = document.getElementById('clear-cancel-btn') as HTMLButtonElement;
const clearConfirmBtn = document.getElementById('clear-confirm-btn') as HTMLButtonElement;

// ─── EARLY message listener — must register ASAP so service worker messages aren't lost ───
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg?.type) return;
  switch (msg.type) {
    case 'SIDEPANEL_OPEN_NEW_PROJECT': {
      const p = msg.payload as { itemId?: string; suggestedName?: string; suggestedDomain?: string } | undefined;
      doOpenNewProjectForm(p?.itemId ?? null, p?.suggestedName ?? '', p?.suggestedDomain ?? '');
      sendResponse({ ok: true });
      break;
    }
    case 'SIDEPANEL_OPEN_SETTINGS': {
      openSettingsModal().catch(() => {});
      sendResponse({ ok: true });
      break;
    }
    case 'SIDEPANEL_SHOW_LIMIT_MESSAGE': {
      const message2 = (msg.payload as { message?: string })?.message ?? 'Project limit reached. Upgrade to Pro for more projects.';
      showUpgradeBanner(message2);
      sendResponse({ ok: true });
      break;
    }
  }
});

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

// ─── Time Grouping ───

function groupByTime(items: ClipItem[]): FlatEntry[] {
  if (items.length === 0) return [];
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);

  // Pinned items go to a dedicated section at the very top
  const pinnedBucket: { item: ClipItem; globalIdx: number }[] = [];

  const buckets: { label: string; items: { item: ClipItem; globalIdx: number }[] }[] = [
    { label: 'TODAY', items: [] },
    { label: 'YESTERDAY', items: [] },
    { label: 'THIS WEEK', items: [] },
    { label: 'OLDER', items: [] },
  ];

  items.forEach((item, i) => {
    if (item.pinned) {
      pinnedBucket.push({ item, globalIdx: i });
      return;
    }
    const ts = item.timestamp;
    if (ts >= todayStart.getTime()) {
      buckets[0].items.push({ item, globalIdx: i });
    } else if (ts >= yesterdayStart.getTime()) {
      buckets[1].items.push({ item, globalIdx: i });
    } else if (ts >= weekStart.getTime()) {
      buckets[2].items.push({ item, globalIdx: i });
    } else {
      buckets[3].items.push({ item, globalIdx: i });
    }
  });

  const result: FlatEntry[] = [];

  // Pinned items first
  if (pinnedBucket.length > 0) {
    result.push({ kind: 'header', label: 'PINNED' });
    for (const entry of pinnedBucket) {
      result.push({ kind: 'item', item: entry.item, globalIdx: entry.globalIdx });
    }
  }

  // Then time-grouped unpinned items
  for (const bucket of buckets) {
    if (bucket.items.length === 0) continue;
    result.push({ kind: 'header', label: bucket.label });
    for (const entry of bucket.items) {
      result.push({ kind: 'item', item: entry.item, globalIdx: entry.globalIdx });
    }
  }
  return result;
}

function getAccentClass(contentType: string): string {
  switch (contentType) {
    case 'url': return 'accent-url';
    case 'code': return 'accent-code';
    case 'email': return 'accent-email';
    case 'html': return 'accent-html';
    default: return 'accent-text';
  }
}

// ─── Empty State ───

function getEmptyStateMessage(): { icon: string; text: string; hint: string } {
  switch (currentView) {
    case 'pinned':
      return {
        icon: '&#128204;',
        text: getMessage('emptyPinnedText') || 'No pinned items',
        hint: getMessage('emptyPinnedHint') || 'Open any item and click Pin to keep it at the top.',
      };
    default:
      return {
        icon: '&#128203;',
        text: getMessage('noHistory') || 'No clipboard items',
        hint: getMessage('emptyDefaultHint') || 'Copy anything on the web — it shows up here automatically.',
      };
  }
}

// ─── Render: Type-Specific List Items ───

function renderUrlItem(item: ClipItem, globalIdx: number, coll: CollectionItem | null | undefined): string {
  let displayDomain = '';
  try {
    displayDomain = new URL(item.content).hostname.replace(/^www\./, '');
  } catch {
    displayDomain = item.content.slice(0, 40);
  }
  const pageTitle = item.sourceTitle || item.preview || '';

  return `
    <div class="clip-item clip-url accent-url ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
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
  const domain = item.sourceDomain && item.sourceDomain !== 'manual' ? item.sourceDomain : '';

  return `
    <div class="clip-item clip-code accent-code ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
      <div class="item-top">
        ${coll ? `<span class="collection-badge" style="background:${coll.color}" title="${escapeHtml(coll.name)}"></span>` : ''}
        ${item.pinned ? '<span class="pin-indicator">&#128204;</span>' : ''}
        ${domain ? `<span class="source-domain" ${item.sourceUrl ? `data-url="${escapeHtml(item.sourceUrl)}"` : ''}>${escapeHtml(domain)}</span>` : ''}
        <span class="preview">${escapeHtml(item.preview)}</span>
        <span class="lang-badge">${lang}</span>
      </div>
      <div class="meta">
        <span class="time">${timeAgo(item.timestamp)}</span>
        <span class="line-count">${lineCount} line${lineCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `;
}

function renderDefaultItem(item: ClipItem, globalIdx: number, coll: CollectionItem | null | undefined): string {
  const accent = getAccentClass(item.contentType);
  const domain = item.sourceDomain && item.sourceDomain !== 'manual' ? item.sourceDomain : '';

  return `
    <div class="clip-item ${accent} ${globalIdx === selectedIndex ? 'selected' : ''}" data-index="${globalIdx}" data-id="${item.id}">
      <div class="item-top">
        ${coll ? `<span class="collection-badge" style="background:${coll.color}" title="${escapeHtml(coll.name)}"></span>` : ''}
        ${item.pinned ? '<span class="pin-indicator">&#128204;</span>' : ''}
        ${domain ? `<span class="source-domain" ${item.sourceUrl ? `data-url="${escapeHtml(item.sourceUrl)}"` : ''}>${escapeHtml(domain)}</span>` : ''}
        <span class="preview">${escapeHtml(item.preview)}</span>
        ${item.pdfCleaned ? '<span class="pdf-badge">PDF</span>' : ''}
        <span class="type-badge">${item.contentType}</span>
      </div>
      <div class="meta">
        <span class="time">${timeAgo(item.timestamp)}</span>
        ${item.wordCount ? `<span class="word-count">${getMessage('words', [String(item.wordCount)]) || item.wordCount + ' words'}</span>` : ''}
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
    itemCountEl.textContent = getMessage('items', ['0']) || '0 items';
    return;
  }

  // Build time-grouped flat list for recent view, flat for pinned
  if (currentView === 'recent') {
    flatList = groupByTime(filteredItems);
  } else {
    flatList = filteredItems.map((item, i) => ({ kind: 'item' as const, item, globalIdx: i }));
  }

  const HEADER_HEIGHT = 28;
  const scrollTop = clipList.scrollTop;
  const containerHeight = clipList.clientHeight;

  // Calculate total height and cumulative heights for variable-size entries
  let totalHeight = 0;
  const entryOffsets: number[] = [];
  for (const entry of flatList) {
    entryOffsets.push(totalHeight);
    totalHeight += entry.kind === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT;
  }

  // Find visible range using binary search on offsets
  let startIdx = 0;
  for (let i = 0; i < flatList.length; i++) {
    if (entryOffsets[i] + (flatList[i].kind === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT) >= scrollTop) {
      startIdx = i;
      break;
    }
  }
  startIdx = Math.max(0, startIdx - BUFFER_SIZE);

  let endIdx = flatList.length;
  for (let i = startIdx; i < flatList.length; i++) {
    if (entryOffsets[i] > scrollTop + containerHeight) {
      endIdx = i;
      break;
    }
  }
  endIdx = Math.min(flatList.length, endIdx + BUFFER_SIZE);

  const visibleEntries = flatList.slice(startIdx, endIdx);
  const offsetY = startIdx < entryOffsets.length ? entryOffsets[startIdx] : 0;

  let html = '';
  for (const entry of visibleEntries) {
    if (entry.kind === 'header') {
      html += `<div class="time-group-header">${entry.label}</div>`;
    } else {
      const { item, globalIdx } = entry;
      const coll = item.collection ? collections.find((c) => c.id === item.collection) : null;
      if (item.contentType === 'url') {
        html += renderUrlItem(item, globalIdx, coll);
      } else if (item.contentType === 'code') {
        html += renderCodeItem(item, globalIdx, coll);
      } else {
        html += renderDefaultItem(item, globalIdx, coll);
      }
    }
  }

  clipList.innerHTML = `
    <div class="virtual-scroll-container">
      <div class="virtual-scroll-spacer" style="height: ${totalHeight}px;">
        <div style="transform: translateY(${offsetY}px);">
          ${html}
        </div>
      </div>
    </div>
  `;

  itemCountEl.textContent = getMessage('items', [String(filteredItems.length)]) || `${filteredItems.length} items`;

  // Click handlers
  clipList.querySelectorAll('.clip-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Source domain click
      const domainEl = target.closest('.source-domain') as HTMLElement;
      if (domainEl && domainEl.dataset.url) {
        e.stopPropagation();
        chrome.tabs.create({ url: domainEl.dataset.url });
        return;
      }
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

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const itemId = (el as HTMLElement).dataset.id || '';
      const index = parseInt((el as HTMLElement).dataset.index || '0', 10);
      const item = filteredItems[index];
      showClipContextMenu(e as MouseEvent, itemId, item);
    });
  });
}

// ─── Right-Click Context Menu ───

function dismissContextMenu(): void {
  const existing = document.getElementById('clip-context-menu');
  if (existing) existing.remove();
}

function showClipContextMenu(e: MouseEvent, itemId: string, item: ClipItem): void {
  dismissContextMenu();

  const projects = collections.filter((c) => c.isProject);
  const hasSource = item.sourceUrl && item.sourceUrl.length > 0;

  // Build menu HTML
  let menuHtml = `
    <div id="clip-context-menu" class="clip-context-menu" style="top:${e.clientY}px;left:${e.clientX}px">
      <button class="ctx-item" data-action="copy">Copy to clipboard</button>
      ${item.citation ? '<button class="ctx-item" data-action="copy-citation">Copy with citation</button>' : ''}
      ${hasSource ? '<button class="ctx-item" data-action="open-source">Open source page</button>' : ''}
      <button class="ctx-item" data-action="pin">${item.pinned ? 'Unpin' : 'Pin to top'}</button>
      <button class="ctx-item" data-action="detail">View details</button>
      <div class="ctx-divider"></div>
  `;

  // Project assignment section
  if (projects.length > 0) {
    menuHtml += `<span class="ctx-section-label">Move to project</span>`;
    projects.forEach((p) => {
      const active = item.collection === p.id;
      menuHtml += `<button class="ctx-item ${active ? 'ctx-active' : ''}" data-action="assign" data-project-id="${p.id}">
        <span class="ctx-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}${active ? ' ✓' : ''}
      </button>`;
    });
    if (item.collection) {
      menuHtml += `<button class="ctx-item" data-action="unassign">Remove from project</button>`;
    }
    menuHtml += `<div class="ctx-divider"></div>`;
  }

  menuHtml += `<button class="ctx-item ctx-new-project" data-action="new-project">+ New Project</button>`;
  menuHtml += `<div class="ctx-divider"></div>`;
  menuHtml += `<button class="ctx-item ctx-danger" data-action="delete">Delete</button>`;
  menuHtml += `</div>`;

  document.body.insertAdjacentHTML('beforeend', menuHtml);
  const menu = document.getElementById('clip-context-menu')!;

  // Keep menu in viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';

  // Handle menu clicks
  menu.addEventListener('click', async (ev) => {
    const btn = (ev.target as HTMLElement).closest('.ctx-item') as HTMLElement;
    if (!btn) return;
    const action = btn.dataset.action;
    menu.remove();

    if (action === 'copy') {
      try { await navigator.clipboard.writeText(item.content); } catch { /* */ }
    } else if (action === 'copy-citation') {
      try { await navigator.clipboard.writeText(item.content + '\n\n' + (item.citation || '')); } catch { /* */ }
    } else if (action === 'open-source') {
      if (item.sourceUrl) chrome.tabs.create({ url: item.sourceUrl });
    } else if (action === 'pin') {
      try {
        await chrome.runtime.sendMessage({ type: 'PIN_CLIPBOARD_ITEM', payload: { id: itemId, pinned: !item.pinned } });
        await loadItems();
      } catch { /* */ }
    } else if (action === 'detail') {
      const index = filteredItems.findIndex((i) => i.id === itemId);
      if (index >= 0) openDetail(index);
    } else if (action === 'delete') {
      try {
        await chrome.runtime.sendMessage({ type: 'DELETE_CLIPBOARD_ITEM', payload: { id: itemId } });
        await loadItems();
        await loadCollections();
        if (activeProjectId) openProjectDetail(activeProjectId);
      } catch { /* */ }
    } else if (action === 'assign') {
      const projectId = btn.dataset.projectId;
      if (projectId) {
        try {
          await chrome.runtime.sendMessage({ type: 'SET_ITEM_COLLECTION', payload: { itemId, collectionId: projectId } });
          await loadItems();
          await loadCollections();
          if (activeProjectId) openProjectDetail(activeProjectId);
        } catch { /* */ }
      }
    } else if (action === 'unassign') {
      try {
        await chrome.runtime.sendMessage({ type: 'SET_ITEM_COLLECTION', payload: { itemId, collectionId: null } });
        await loadItems();
        await loadCollections();
        if (activeProjectId) openProjectDetail(activeProjectId);
      } catch { /* */ }
    } else if (action === 'new-project') {
      pendingItemIdForProject = itemId;
      tryOpenNewProjectFromItem(item);
    }
  });

  // Close on click outside or right-click elsewhere
  const closeMenu = (ev: Event) => {
    if (!menu.contains(ev.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  }, 0);
}

// Right-click on project cards
function showProjectContextMenu(e: MouseEvent, projectId: string): void {
  dismissContextMenu();

  const project = collections.find((c) => c.id === projectId);
  if (!project) return;

  const menuHtml = `
    <div id="clip-context-menu" class="clip-context-menu" style="top:${e.clientY}px;left:${e.clientX}px">
      <button class="ctx-item" data-action="open">Open project</button>
      <button class="ctx-item" data-action="rename">Rename</button>
      <button class="ctx-item" data-action="edit">Edit settings</button>
      <div class="ctx-divider"></div>
      <button class="ctx-item ctx-danger" data-action="delete">Delete project</button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', menuHtml);
  const menu = document.getElementById('clip-context-menu')!;

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';

  menu.addEventListener('click', async (ev) => {
    const btn = (ev.target as HTMLElement).closest('.ctx-item') as HTMLElement;
    if (!btn) return;
    const action = btn.dataset.action;
    menu.remove();

    if (action === 'open') {
      openProjectDetail(projectId);
    } else if (action === 'rename') {
      editingProjectId = projectId;
      openProjectOverlay(project);
    } else if (action === 'edit') {
      editingProjectId = projectId;
      openProjectOverlay(project);
    } else if (action === 'delete') {
      if (!confirm(`Delete project "${project.name}"? Items will be uncategorized but not deleted.`)) return;
      try {
        await chrome.runtime.sendMessage({ type: 'DELETE_COLLECTION', payload: { id: projectId } });
        await loadCollections();
        renderProjectsList();
      } catch { /* */ }
    }
  });

  const closeMenu = (ev: Event) => {
    if (!menu.contains(ev.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  }, 0);
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
      <div>${item.contentType} &bull; ${timeAgo(item.timestamp)} &bull; ${getMessage('words', [String(item.wordCount || 0)]) || (item.wordCount || 0) + ' words'}${item.pdfCleaned ? ' &bull; PDF cleaned' : ''}</div>
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
    ? (getMessage('unpin') || 'Unpin')
    : (getMessage('pin') || 'Pin');

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
  // Projects view is handled separately — don't render clipList
  if (currentView === 'projects') {
    return;
  }

  let items = [...allItems];

  // Apply view filter
  if (currentView === 'pinned') {
    items = items.filter((i) => i.pinned);
  }
  // 'recent' shows everything

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    items = items.filter(
      (i) =>
        i.content.toLowerCase().includes(q) ||
        i.preview.toLowerCase().includes(q) ||
        (i.sourceDomain && i.sourceDomain.toLowerCase().includes(q)) ||
        (i.sourceTitle && i.sourceTitle.toLowerCase().includes(q))
    );
  }

  filteredItems = items;
  renderList();
}

async function loadItems(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CLIPBOARD_HISTORY',
      payload: { limit: 500 },
    });
    allItems = Array.isArray(response) ? response : [];

    // Check capacity for free-tier upgrade prompt (uses cached pro status)
    checkCapacityWarning();

    applyFilter();
  } catch {
    allItems = [];
    applyFilter();
  }
}

// Cached pro status — avoids a GET_PRO_STATUS roundtrip on every loadItems()
let _cachedIsPro: boolean | null = null;
let _cachedIsProAt = 0;
const PRO_CACHE_TTL = 60_000; // 1 minute

async function getCachedProStatus(): Promise<boolean> {
  const now = Date.now();
  if (_cachedIsPro !== null && now - _cachedIsProAt < PRO_CACHE_TTL) return _cachedIsPro;
  try {
    const proRes = await chrome.runtime.sendMessage({ type: 'GET_PRO_STATUS', payload: {} });
    _cachedIsPro = !!(proRes as { isPro: boolean })?.isPro;
    _cachedIsProAt = now;
  } catch {
    if (_cachedIsPro === null) _cachedIsPro = false;
  }
  return _cachedIsPro;
}

function checkCapacityWarning(): void {
  // Use cached pro status — don't block on async call
  if (_cachedIsPro) return; // Pro users never see this
  if (allItems.length >= 450) {
    showUpgradeBanner(`${allItems.length}/500 clips used. Upgrade for 100,000 clips.`);
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

// View tabs
viewTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = (tab.dataset.view || 'recent') as 'recent' | 'pinned' | 'projects';

    viewTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentView = view;

    if (view === 'projects') {
      showProjectsPanel();
    } else {
      hideProjectsPanel();
      applyFilter();
    }
  });
});

// Keyboard navigation
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Check if user is typing in an input/textarea — don't intercept their keystrokes
  const active = document.activeElement;
  const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active as HTMLElement)?.isContentEditable;

  if (e.key === 'Escape') {
    if (!settingsOverlay.classList.contains('hidden')) {
      closeSettingsModal();
    } else if (!projectOverlay.classList.contains('hidden')) {
      projectOverlay.classList.add('hidden');
      pendingItemIdForProject = null;
    } else if (!addOverlay.classList.contains('hidden')) {
      addOverlay.classList.add('hidden');
    } else if (!detailPanel.classList.contains('hidden')) {
      closeDetail();
    } else if (!projectDetail.classList.contains('hidden')) {
      closeProjectDetail();
    } else if (active === searchInput) {
      searchInput.blur();
      searchInput.value = '';
      searchQuery = '';
      applyFilter();
    }
    return;
  }

  // Don't hijack keys when user is typing in any input field
  if (isTyping) return;

  if (e.key === '/') {
    e.preventDefault();
    searchInput.focus();
    return;
  }

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
    detailCopy.textContent = getMessage('copied') || 'Copied!';
    setTimeout(() => {
      detailCopy.textContent = getMessage('copy') || 'Copy';
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
      ? (getMessage('unpin') || 'Unpin')
      : (getMessage('pin') || 'Pin');
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

// Clear all — open the Clear Data modal
clearAllBtn.addEventListener('click', () => {
  // Reset toggles to defaults
  clearHistory.checked = true;
  clearPinned.checked = false;
  clearProjects.checked = false;
  clearConfirmBtn.disabled = false;
  clearConfirmBtn.textContent = 'Delete Selected';
  updateClearBtnState();
  clearOverlay.classList.remove('hidden');
});

function updateClearBtnState(): void {
  const anySelected = clearHistory.checked || clearPinned.checked || clearProjects.checked;
  clearConfirmBtn.disabled = !anySelected;
}

clearHistory.addEventListener('change', updateClearBtnState);
clearPinned.addEventListener('change', updateClearBtnState);
clearProjects.addEventListener('change', updateClearBtnState);

function closeClearModal(): void {
  clearOverlay.classList.add('hidden');
}

clearOverlayClose.addEventListener('click', closeClearModal);
clearCancelBtn.addEventListener('click', closeClearModal);
clearOverlay.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeClearModal();
});

clearConfirmBtn.addEventListener('click', async () => {
  const opts = {
    history: clearHistory.checked,
    pinned: clearPinned.checked,
    projects: clearProjects.checked,
  };
  if (!opts.history && !opts.pinned && !opts.projects) return;

  clearConfirmBtn.disabled = true;
  clearConfirmBtn.textContent = 'Deleting...';

  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_SELECTIVE', payload: opts });

    // Refresh all data from backend
    try {
      const items = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD_HISTORY', payload: { limit: 500 } });
      allItems = Array.isArray(items) ? items : [];
    } catch {
      allItems = [];
    }
    await loadCollections();
    renderProjectsList();
    applyFilter();
    closeClearModal();
  } catch {
    clearConfirmBtn.textContent = 'Error — try again';
    clearConfirmBtn.disabled = false;
  }
});

// Scroll-based re-render for virtual scroll
clipList.addEventListener('scroll', () => {
  renderList();
});

// Helpers
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return getMessage('justNow') || 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return getMessage('minutesAgo', [String(minutes)]) || `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return getMessage('hoursAgo', [String(hours)]) || `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return getMessage('daysAgo', [String(days)]) || `${days}d ago`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Collections ───

const projectsCountBadge = document.getElementById('projects-count-badge') as HTMLSpanElement;

async function loadCollections(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_COLLECTIONS',
      payload: {},
    });
    collections = Array.isArray(response) ? response : [];
  } catch {
    collections = [];
  }
  // Update projects count badge
  const projectCount = collections.filter((c) => c.isProject).length;
  if (projectCount > 0) {
    projectsCountBadge.textContent = String(projectCount);
    projectsCountBadge.classList.remove('hidden');
  } else {
    projectsCountBadge.classList.add('hidden');
  }
}

function populateCollectionSelect(select: HTMLSelectElement, currentValue: string): void {
  select.innerHTML = `<option value="">No project</option>`;
  // Show projects first, then other collections
  const projects = collections.filter((c) => c.isProject);
  const others = collections.filter((c) => !c.isProject);
  for (const c of projects) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `📁 ${c.name}`;
    select.appendChild(opt);
  }
  if (others.length > 0 && projects.length > 0) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '── Collections ──';
    select.appendChild(sep);
  }
  for (const c of others) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  }
  select.value = currentValue;
}

// Detail: copy with citation
detailCopyCitation.addEventListener('click', async () => {
  if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return;
  const item = filteredItems[selectedIndex];
  try {
    await chrome.runtime.sendMessage({
      type: 'PASTE_ITEM',
      payload: { id: item.id, format: 'with-citation' },
    });
    detailCopyCitation.textContent = getMessage('copied') || 'Copied!';
    setTimeout(() => {
      detailCopyCitation.textContent = getMessage('cite') || '+ Cite';
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

  addSaveBtn.textContent = getMessage('saving') || 'Saving...';
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

  addSaveBtn.textContent = getMessage('save') || 'Save';
  addSaveBtn.disabled = false;
});

// Close overlay on Escape
addOverlay.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') addOverlay.classList.add('hidden');
});

// ─── Projects Panel ───

function showProjectsPanel(): void {
  clipList.classList.add('hidden');
  projectsPanel.classList.remove('hidden');
  projectDetail.classList.add('hidden');
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
    <div class="project-card" data-project-id="${p.id}" style="border-left-color:${p.color}">
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
    // Right-click on project cards
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const projectId = (el as HTMLElement).dataset.projectId;
      if (projectId) showProjectContextMenu(ev as MouseEvent, projectId);
    });
  });
}

async function openProjectDetail(projectId: string): Promise<void> {
  activeProjectId = projectId;
  const project = collections.find((c) => c.id === projectId);
  if (!project) return;

  // Load project items
  const projectItems = allItems.filter((i) => i.collection === projectId);

  // Build summary stats
  const typeCounts: Record<string, number> = {};
  for (const item of projectItems) {
    const t = item.contentType || 'text';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const statLabels: Record<string, string> = {
    text: 'Text', url: 'URLs', code: 'Code', email: 'Emails', html: 'HTML', image: 'Images',
  };
  const statsHtml = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([t, n]) => `<span class="project-stat-chip">${statLabels[t] || t}: ${n}</span>`)
    .join('');

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
    ${projectItems.length > 0 ? `<div class="project-stats-bar">${projectItems.length} item${projectItems.length !== 1 ? 's' : ''}${statsHtml ? ' &mdash; ' + statsHtml : ''}</div>` : ''}
  `;
  if (projectItems.length === 0) {
    projectItemsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128194;</div>
        <div class="empty-text">No items in this project yet</div>
        <div class="empty-hint">Copy content from ${project.autoCaptureDomains.length > 0 ? project.autoCaptureDomains.join(', ') : 'your assigned domains'} to auto-file here.</div>
      </div>
    `;
  } else {
    // Group items by content type for organized display
    const typeOrder: string[] = ['text', 'url', 'code', 'email', 'html', 'image'];
    const typeLabels: Record<string, string> = {
      text: 'Text Clips', url: 'URLs', code: 'Code Snippets',
      email: 'Emails', html: 'HTML', image: 'Images',
    };
    const typeIcons: Record<string, string> = {
      text: '&#128196;', url: '&#128279;', code: '&#128187;',
      email: '&#9993;', html: '&#128195;', image: '&#128444;',
    };
    const grouped: Record<string, typeof projectItems> = {};
    for (const item of projectItems) {
      const t = item.contentType || 'text';
      (grouped[t] ??= []).push(item);
    }
    const activeTypes = typeOrder.filter((t) => grouped[t]?.length);
    // If only one type, skip grouping headers
    const showHeaders = activeTypes.length > 1;
    let idx = 0;
    let html = '';
    for (const t of activeTypes) {
      const items = grouped[t]!;
      if (showHeaders) {
        html += `<div class="project-type-group" data-type="${t}">
          <button class="project-type-header" data-type="${t}">
            <span class="project-type-icon">${typeIcons[t] || ''}</span>
            <span class="project-type-label">${typeLabels[t] || t}</span>
            <span class="project-type-count">${items.length}</span>
            <span class="project-type-chevron">&#9660;</span>
          </button>
          <div class="project-type-items">`;
      }
      for (const item of items) {
        const coll = null;
        if (item.contentType === 'url') html += renderUrlItem(item, idx, coll);
        else if (item.contentType === 'code') html += renderCodeItem(item, idx, coll);
        else html += renderDefaultItem(item, idx, coll);
        idx++;
      }
      if (showHeaders) {
        html += `</div></div>`;
      }
    }
    projectItemsList.innerHTML = html;

    // Toggle group collapse
    projectItemsList.querySelectorAll('.project-type-header').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = (btn as HTMLElement).closest('.project-type-group') as HTMLElement;
        if (group) group.classList.toggle('collapsed');
      });
    });

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
        const itemId = (el as HTMLElement).dataset.id;
        const item = allItems.find((ai) => ai.id === itemId);
        if (item) {
          filteredItems = [item];
          openDetail(0);
        }
      });

      // Right-click context menu for project items
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const itemId = (el as HTMLElement).dataset.id || '';
        const item = allItems.find((ai) => ai.id === itemId);
        if (item) {
          showClipContextMenu(e as MouseEvent, itemId, item);
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

// Export project helpers
async function exportProject(format: 'text' | 'html' | 'pdf'): Promise<void> {
  if (!activeProjectId) return;
  const project = collections.find((c) => c.id === activeProjectId);
  const slug = project ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'project';

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'EXPORT_PROJECT',
      payload: { collectionId: activeProjectId, format: format === 'pdf' ? 'html' : format },
    }) as { ok?: boolean; content?: string; error?: string } | null;

    if (!result?.content) {
      showUpgradeBanner(result?.error || 'Export failed — no content to export.');
      return;
    }

    if (format === 'pdf') {
      // Open HTML in new tab for print-to-PDF
      const blob = new Blob([result.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, '_blank');
      if (printWin) {
        printWin.onload = () => { printWin.print(); };
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      const ext = format === 'html' ? 'html' : 'txt';
      const mime = format === 'html' ? 'text/html' : 'text/plain';
      downloadFile(result.content, `${slug}-export.${ext}`, mime);
    }
  } catch {
    showUpgradeBanner('Export failed. Please try again.');
  }
}

projectExportTxt.addEventListener('click', () => exportProject('text'));
projectExportHtml.addEventListener('click', () => exportProject('html'));
projectExportPdf.addEventListener('click', () => exportProject('pdf'));

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

// Shared: check project limit then open overlay
async function tryOpenNewProject(): Promise<void> {
  const projects = collections.filter((c) => c.isProject);
  const isPro = await getCachedProStatus();
  const limit = isPro ? 100 : 3;
  if (projects.length >= limit) {
    showUpgradeBanner(`Project limit reached (${projects.length}/${limit}). Upgrade to Pro for more projects.`);
    return;
  }
  editingProjectId = null;
  openProjectOverlay(null);
}

// Smart new project from a clip item — pre-fills domain + suggested name
async function tryOpenNewProjectFromItem(item: ClipItem): Promise<void> {
  const projects = collections.filter((c) => c.isProject);
  const isPro = await getCachedProStatus();
  const limit = isPro ? 100 : 3;
  if (projects.length >= limit) {
    showUpgradeBanner(`Project limit reached (${projects.length}/${limit}). Upgrade to Pro for more projects.`);
    return;
  }
  editingProjectId = null;
  // Pre-fill with source info from the clip
  const domain = item.sourceDomain && item.sourceDomain !== 'manual' ? item.sourceDomain : '';
  const suggestedName = item.sourceTitle
    ? item.sourceTitle.split(/[|\-–—]/)[0].trim().slice(0, 50)
    : domain
      ? domain.replace(/^www\./, '').split('.')[0].charAt(0).toUpperCase() + domain.replace(/^www\./, '').split('.')[0].slice(1)
      : '';
  projectNameInput.value = suggestedName;
  projectDescInput.value = '';
  projectFormDomains = domain ? [domain] : [];
  projectFormColor = COLLECTION_COLORS[projects.length % COLLECTION_COLORS.length];
  projectSaveBtn.textContent = 'Create Project';
  renderDomainChips();
  renderColorPicker();
  projectOverlay.classList.remove('hidden');
  projectNameInput.focus();
  projectNameInput.select();
}

// New project button
newProjectBtn.addEventListener('click', () => { tryOpenNewProject(); });

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
  pendingItemIdForProject = null;
});

projectOverlay.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    projectOverlay.classList.add('hidden');
    pendingItemIdForProject = null;
  }
});

projectSaveBtn.addEventListener('click', async () => {
  const name = projectNameInput.value.trim();
  if (!name) {
    projectNameInput.focus();
    return;
  }

  const wasEditing = editingProjectId;
  projectSaveBtn.disabled = true;
  projectSaveBtn.textContent = 'Saving...';

  try {
    if (wasEditing) {
      // Update existing project
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PROJECT',
        payload: {
          id: wasEditing,
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
      const res = result as { ok?: boolean; error?: string; collection?: { id: string } } | null;
      if (res && res.ok === false && res.error) {
        showUpgradeBanner(res.error);
        projectSaveBtn.disabled = false;
        projectSaveBtn.textContent = wasEditing ? 'Save Changes' : 'Create Project';
        return;
      }
      // If there's a pending item from right-click, assign it to the new project
      if (pendingItemIdForProject && res?.collection?.id) {
        try {
          await chrome.runtime.sendMessage({
            type: 'SET_ITEM_COLLECTION',
            payload: { itemId: pendingItemIdForProject, collectionId: res.collection.id },
          });
        } catch { /* */ }
        pendingItemIdForProject = null;
      }
    }

    projectOverlay.classList.add('hidden');
    editingProjectId = null;
    await loadCollections();
    await loadItems();

    if (wasEditing && activeProjectId === wasEditing) {
      openProjectDetail(wasEditing);
    } else {
      renderProjectsList();
    }
  } catch (err) {
    // Show error instead of silently failing
    showUpgradeBanner('Failed to save project. Please try again.');
  }

  projectSaveBtn.disabled = false;
  projectSaveBtn.textContent = wasEditing ? 'Save Changes' : 'Create Project';
});

// Footer "+ Project" button — always accessible from any view
newProjectFooterBtn.addEventListener('click', () => { tryOpenNewProject(); });

// Settings button — opens in-panel settings modal (overlay shown immediately, never blocks)
openSettingsBtn.addEventListener('click', () => {
  openSettingsModal().catch(() => {});
});

// Detail panel: "+ new project" button
detailNewProject.addEventListener('click', () => { tryOpenNewProject(); });

// ─── Settings Modal ───

let settingsIsPro = false;
let settingsOverrides: Record<string, { enabled: boolean; mode: string }> = {};

function escapeHtmlSettings(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderSettingsOverrides(): void {
  const domains = Object.keys(settingsOverrides);
  if (domains.length === 0) {
    sOverridesList.innerHTML = '<div class="s-no-overrides">No site overrides configured.</div>';
    return;
  }
  sOverridesList.innerHTML = domains.map((domain) => `
    <div class="s-override-row">
      <span class="s-override-domain">${escapeHtmlSettings(domain)}</span>
      <span class="s-override-mode">${settingsOverrides[domain].mode}</span>
      <button class="s-override-remove" data-domain="${escapeHtmlSettings(domain)}" aria-label="Remove">&times;</button>
    </div>
  `).join('');

  sOverridesList.querySelectorAll('.s-override-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const domain = (btn as HTMLElement).dataset.domain || '';
      delete settingsOverrides[domain];
      saveSettingsWithOverrides();
      renderSettingsOverrides();
    });
  });
}

function applyProStatusToSettings(isPro: boolean): void {
  settingsIsPro = isPro;
  if (isPro) {
    sProStatusLabel.textContent = 'Pro Plan Active';
    sUpgradeBtn.classList.add('hidden');
    if (sManageRow) sManageRow.classList.remove('hidden');
    if (sProActiveInfo) sProActiveInfo.classList.remove('hidden');
    if (sProUpgradeSection) sProUpgradeSection.classList.add('hidden');
    sMaxItems.max = '100000';
    sRetention.max = '3650';
    sPdfCleanup.disabled = false;
    const fmtOpt = sCitation.querySelector('option[value="formatted"]') as HTMLOptionElement;
    if (fmtOpt) fmtOpt.disabled = false;
  } else {
    sProStatusLabel.textContent = 'Free Plan';
    sUpgradeBtn.classList.remove('hidden');
    if (sManageRow) sManageRow.classList.add('hidden');
    if (sProActiveInfo) sProActiveInfo.classList.add('hidden');
    if (sProUpgradeSection) sProUpgradeSection.classList.remove('hidden');
    sMaxItems.max = '500';
    sRetention.max = '30';
    if (parseInt(sMaxItems.value, 10) > 500) sMaxItems.value = '500';
    if (parseInt(sRetention.value, 10) > 30) sRetention.value = '30';
    sPdfCleanup.disabled = true;
    sPdfCleanup.checked = false;
    const fmtOpt = sCitation.querySelector('option[value="formatted"]') as HTMLOptionElement;
    if (fmtOpt) fmtOpt.disabled = true;
    if (sCitation.value === 'formatted') sCitation.value = 'url';
  }
}

async function loadSettingsStats(): Promise<void> {
  try {
    const result = await chrome.storage.local.get('copyunlock_stats');
    const stats = result.copyunlock_stats || { totalUnlocks: 0, totalCopies: 0, totalWatermarks: 0 };
    if (sStatUnlocks) sStatUnlocks.textContent = String(stats.totalUnlocks);
    if (sStatCopies) sStatCopies.textContent = String(stats.totalCopies);
    if (sStatWatermarks) sStatWatermarks.textContent = String(stats.totalWatermarks);
  } catch { /* zeros */ }
}

async function loadProDetails(): Promise<void> {
  try {
    const cache = await chrome.storage.local.get('copyunlock_license_cache');
    const cached = cache['copyunlock_license_cache'];
    if (cached?.plan && sProPlanName) {
      sProPlanName.textContent = cached.plan.charAt(0).toUpperCase() + cached.plan.slice(1);
    }
    if (cached?.expiresAt && sProRenewsAt) {
      const renewDate = new Date(cached.expiresAt);
      if (!isNaN(renewDate.getTime())) {
        sProRenewsAt.textContent = `Renews ${renewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    }
  } catch { /* */ }
}

async function openSettingsModal(): Promise<void> {
  // Dismiss any open context menu first
  dismissContextMenu();
  // Show overlay IMMEDIATELY — never block on async calls
  // Use last-known pro status as initial state (updated async below)
  applyProStatusToSettings(_cachedIsPro === true);
  settingsOverlay.classList.remove('hidden');

  // Set version
  try {
    const manifest = chrome.runtime.getManifest();
    if (sVersion) sVersion.textContent = manifest.version;
  } catch { /* */ }

  // Load settings from storage (non-blocking — overlay is already visible)
  try {
    const result = await chrome.storage.sync.get('copyunlock_settings');
    const s = result.copyunlock_settings || {};
    sEnabled.checked = s.enabled !== false;
    sMode.value = s.defaultMode || 'auto';
    sNotifications.checked = s.showNotifications !== false;
    sContextMenu.checked = s.contextMenuEnabled !== false;
    sClipboard.checked = s.clipboardHistoryEnabled !== false;
    sMaxItems.value = String(s.maxItems || 500);
    sRetention.value = String(s.retentionDays || 30);
    sWatermark.checked = s.watermarkStripping !== false;
    sCitation.value = s.autoCitation || 'url';
    sPasteFormat.value = s.defaultPasteFormat || 'plain';
    sPdfCleanup.checked = s.pdfCleanup || false;
    // Load site overrides
    settingsOverrides = s.siteOverrides || {};
    renderSettingsOverrides();
    // Re-apply pro constraints after loading settings (max values may need clamping)
    applyProStatusToSettings(settingsIsPro);
  } catch { /* use defaults */ }

  // Load language preference
  try {
    const langResult = await chrome.storage.sync.get('copyunlock_language');
    if (sLanguage) sLanguage.value = langResult.copyunlock_language || 'auto';
  } catch { /* */ }

  // Load stats
  loadSettingsStats();
  loadProDetails();

  // Async update pro status with 3s timeout — if it takes longer, cached status stands
  try {
    const proPromise = getCachedProStatus();
    const timeoutPromise = new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    const isPro = await Promise.race([proPromise, timeoutPromise]);
    applyProStatusToSettings(isPro);
    if (isPro) loadProDetails();
  } catch {
    // Timeout or error — keep whatever status we already applied
  }
}

function closeSettingsModal(): void {
  settingsOverlay.classList.add('hidden');
}

async function saveSettings(): Promise<void> {
  const updated: Record<string, unknown> = {
    enabled: sEnabled.checked,
    defaultMode: sMode.value,
    showNotifications: sNotifications.checked,
    contextMenuEnabled: sContextMenu.checked,
    clipboardHistoryEnabled: sClipboard.checked,
    maxItems: parseInt(sMaxItems.value, 10) || 500,
    retentionDays: parseInt(sRetention.value, 10) || 30,
    watermarkStripping: sWatermark.checked,
    autoCitation: sCitation.value,
    defaultPasteFormat: sPasteFormat.value,
    pdfCleanup: sPdfCleanup.checked,
    siteOverrides: settingsOverrides,
  };
  try {
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: updated });
  } catch { /* */ }
}

async function saveSettingsWithOverrides(): Promise<void> {
  await saveSettings();
}

// Auto-save on every change
[sEnabled, sNotifications, sContextMenu, sClipboard, sWatermark, sPdfCleanup].forEach((el) => {
  el.addEventListener('change', saveSettings);
});
[sMode, sCitation, sPasteFormat].forEach((el) => {
  el.addEventListener('change', saveSettings);
});
[sMaxItems, sRetention].forEach((el) => {
  el.addEventListener('change', saveSettings);
});

settingsOverlayClose.addEventListener('click', closeSettingsModal);
settingsOverlay.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeSettingsModal();
});

sUpgradeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', payload: { plan: 'monthly' } });
});

// Show upgrade prompt when user clicks disabled Pro-only toggles
sPdfCleanup.closest('.settings-toggle')?.addEventListener('click', () => {
  if (sPdfCleanup.disabled) {
    showUpgradeBanner('PDF Cleanup is a Pro feature. Upgrade to unlock it.');
  }
});

if (sManageSubBtn) {
  sManageSubBtn.addEventListener('click', () => {
    sManageSubBtn.disabled = true;
    sManageSubBtn.textContent = 'Opening…';
    chrome.runtime.sendMessage({ type: 'OPEN_BILLING_PORTAL', payload: {} }).then((result) => {
      if (!result?.ok) {
        showUpgradeBanner('Could not open billing portal. Please contact support@peaktools.dev.');
      }
    }).catch(() => {
      showUpgradeBanner('Could not open billing portal. Please contact support@peaktools.dev.');
    }).finally(() => {
      sManageSubBtn.disabled = false;
      sManageSubBtn.textContent = 'Manage';
    });
  });
}

// ─── Site Overrides ───
sAddOverride.addEventListener('click', () => {
  const domain = sOverrideDomain.value.trim();
  const mode = sOverrideMode.value;
  if (!domain) return;
  settingsOverrides[domain] = { enabled: mode !== 'disabled', mode: mode === 'disabled' ? 'auto' : mode };
  sOverrideDomain.value = '';
  saveSettingsWithOverrides();
  renderSettingsOverrides();
});

// ─── Language Selector ───
if (sLanguage) {
  sLanguage.addEventListener('change', async () => {
    const lang = sLanguage.value;
    try {
      await chrome.storage.sync.set({ copyunlock_language: lang });
    } catch { /* */ }
    // Re-initialize i18n with new locale and re-apply ALL translations
    await initI18n(lang);
    applyI18n();
    // Notify service worker to rebuild context menus with new locale
    try {
      await chrome.runtime.sendMessage({ type: 'LANGUAGE_CHANGED', payload: { locale: lang } });
    } catch { /* */ }
  });
}

// ─── Keyboard Shortcuts Link ───
if (sConfigureShortcuts) {
  sConfigureShortcuts.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

// ─── Plan Card Checkout Buttons ───
sPlanCards.forEach((btn) => {
  btn.addEventListener('click', () => {
    const plan = btn.dataset.plan || 'monthly';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
    chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', payload: { plan } }).then(() => {
      setTimeout(() => {
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }, 3000);
    });
  });
});

// ─── Refresh License Buttons ───
function handleRefreshLicenseSettings(): void {
  showUpgradeBanner('Checking license...');
  chrome.runtime.sendMessage({ type: 'CHECK_LICENSE', payload: {} }).then((result) => {
    if (result?.isPro) {
      showUpgradeBanner('Pro license verified!');
      applyProStatusToSettings(true);
      loadProDetails();
    } else {
      showUpgradeBanner('No active license found.');
    }
  }).catch(() => {
    showUpgradeBanner('License check failed.');
  });
}

if (sRefreshLicense) sRefreshLicense.addEventListener('click', handleRefreshLicenseSettings);
if (sRefreshLicenseFree) sRefreshLicenseFree.addEventListener('click', handleRefreshLicenseSettings);

// ─── Export Data ───
sExportData.addEventListener('click', async () => {
  try {
    const syncData = await chrome.storage.sync.get(null);
    const localData = await chrome.storage.local.get(null);
    const exportPayload = { sync: syncData, local: localData, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copyunlock-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showUpgradeBanner('Data exported successfully.');
  } catch {
    showUpgradeBanner('Export failed.');
  }
});

// ─── Import Data ───
sImportData.addEventListener('click', () => {
  sImportFile.click();
});

sImportFile.addEventListener('change', async () => {
  const file = sImportFile.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.sync) await chrome.storage.sync.set(data.sync);
    if (data.local) await chrome.storage.local.set(data.local);
    showUpgradeBanner('Data imported successfully. Reloading settings...');
    // Reload settings modal
    setTimeout(() => openSettingsModal(), 500);
  } catch {
    showUpgradeBanner('Import failed — invalid file.');
  }
  sImportFile.value = '';
});

// Check for pending settings modal open (from right-click menu "Settings")
async function checkPendingSettingsOpen(): Promise<void> {
  try {
    const data = await chrome.storage.session.get('openSettingsModal');
    if (data.openSettingsModal) {
      openSettingsModal();
      // Remove flag AFTER opening (not before) so retries can re-trigger if it fails
      await chrome.storage.session.remove('openSettingsModal');
    }
  } catch { /* */ }
}

// Check for pending limit message (from right-click when project limit hit)
async function checkPendingLimitMessage(): Promise<void> {
  try {
    const data = await chrome.storage.session.get('pendingLimitMessage');
    if (data.pendingLimitMessage) {
      await chrome.storage.session.remove('pendingLimitMessage');
      showUpgradeBanner(data.pendingLimitMessage as string);
    }
  } catch { /* */ }
}

// Check for pending project creation when sidepanel regains focus
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkPendingProjectCreation();
    checkPendingSettingsOpen();
    checkPendingLimitMessage();
  }
});

// (Message listener moved to top of file for early registration — see line 131)

function doOpenNewProjectForm(itemId: string | null, suggestedName: string, suggestedDomain: string): void {
  pendingItemIdForProject = itemId;
  editingProjectId = null;
  projectNameInput.value = suggestedName;
  projectDescInput.value = '';
  projectFormDomains = suggestedDomain ? [suggestedDomain] : [];
  projectFormColor = COLLECTION_COLORS[collections.filter((c) => c.isProject).length % COLLECTION_COLORS.length];
  projectSaveBtn.textContent = 'Create Project';
  renderDomainChips();
  renderColorPicker();
  projectOverlay.classList.remove('hidden');
  projectNameInput.focus();
  projectNameInput.select();
}

// Auto-refresh every 10 seconds (was 3s — too aggressive, caused sluggish UI)
refreshInterval = setInterval(() => {
  loadItems();
  loadCollections();
}, 10_000);

// Initialize i18n with user's language preference, then apply translations
initI18n().then(() => applyI18n());

// Check for pending project creation (from right-click "New Project") — fallback for when sidepanel wasn't open
async function checkPendingProjectCreation(): Promise<void> {
  try {
    const data = await chrome.storage.session.get('pendingProjectCreation');
    const pending = data.pendingProjectCreation as {
      itemId: string;
      suggestedName: string;
      suggestedDomain: string;
    } | undefined;
    if (!pending) return;
    await chrome.storage.session.remove('pendingProjectCreation');
    doOpenNewProjectForm(pending.itemId, pending.suggestedName || '', pending.suggestedDomain || '');
  } catch { /* */ }
}

// Init — check pending flags IMMEDIATELY, don't wait for data loads
checkPendingSettingsOpen();
checkPendingProjectCreation();
checkPendingLimitMessage();

// Prime pro status cache so checkCapacityWarning is instant
getCachedProStatus();

loadItems();
loadCollections().then(() => {
  // Re-check after collections load in case session storage was written after our first check
  checkPendingProjectCreation();
  checkPendingSettingsOpen();
  checkPendingLimitMessage();
});

// Poll for pending flags briefly after init to catch late session storage writes from service worker
const _pendingPoll = setInterval(() => { checkPendingSettingsOpen(); checkPendingProjectCreation(); }, 200);
setTimeout(() => clearInterval(_pendingPoll), 3000);
