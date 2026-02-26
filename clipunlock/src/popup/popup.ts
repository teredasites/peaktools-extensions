// DOM Refs
const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
const toggleLabel = toggleBtn.querySelector('.toggle-label') as HTMLSpanElement;
const siteDomain = document.getElementById('site-domain') as HTMLSpanElement;
const protectionBadge = document.getElementById('protection-badge') as HTMLDivElement;
const protectionCount = document.getElementById('protection-count') as HTMLSpanElement;
const modeButtons = document.querySelectorAll('.mode-btn') as NodeListOf<HTMLButtonElement>;
const recentItemsContainer = document.getElementById('recent-items') as HTMLDivElement;
const openSidepanelBtn = document.getElementById('open-sidepanel') as HTMLButtonElement;
const openOptionsBtn = document.getElementById('open-options') as HTMLButtonElement;

let currentTabId: number | null = null;

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

function setUnlockedState(active: boolean, protections: number = 0): void {
  if (active) {
    toggleBtn.classList.add('active');
    toggleLabel.textContent = chrome.i18n.getMessage('popupActive') || 'Active';
  } else {
    toggleBtn.classList.remove('active');
    toggleLabel.textContent = chrome.i18n.getMessage('popupEnable') || 'Enable';
  }

  if (protections > 0) {
    protectionBadge.classList.remove('hidden');
    protectionCount.textContent =
      chrome.i18n.getMessage('popupProtections', [String(protections)]) ||
      `${protections} protections removed`;
  } else {
    protectionBadge.classList.add('hidden');
  }
}

function setMode(mode: string): void {
  modeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function renderRecentItems(items: Array<{ id: string; preview: string; contentType: string; timestamp: number }>): void {
  if (!items || items.length === 0) {
    recentItemsContainer.innerHTML = `<div class="no-items">${chrome.i18n.getMessage('noHistory') || 'No recent copies'}</div>`;
    return;
  }

  recentItemsContainer.innerHTML = items
    .slice(0, 5)
    .map(
      (item) => `
    <div class="recent-item" data-id="${item.id}" title="${escapeHtml(item.preview)}">
      <span class="type-badge">${item.contentType}</span>
      <span class="preview">${escapeHtml(item.preview)}</span>
      <span class="time">${timeAgo(item.timestamp)}</span>
    </div>
  `
    )
    .join('');

  // Click to copy
  recentItemsContainer.querySelectorAll('.recent-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.id;
      if (id) {
        chrome.runtime.sendMessage({ type: 'COPY_ITEM', payload: { id } });
      }
    });
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
async function init(): Promise<void> {
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    currentTabId = tab.id;
    try {
      const url = new URL(tab.url || '');
      siteDomain.textContent = url.hostname;
    } catch {
      siteDomain.textContent = '';
    }
  }

  // Get tab state — relay through background to content script
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_TAB_STATE',
      payload: { tabId: currentTabId },
    });
    if (response) {
      setUnlockedState(response.unlocked || response.enabled, response.protectionsRemoved || 0);
      setMode(response.mode || 'auto');
    }
  } catch {
    setUnlockedState(false);
    setMode('auto');
  }

  // Load recent clipboard items from background (IDB)
  try {
    const items = await chrome.runtime.sendMessage({
      type: 'GET_CLIPBOARD_HISTORY',
      payload: { limit: 5 },
    });
    renderRecentItems(Array.isArray(items) ? items : []);
  } catch {
    renderRecentItems([]);
  }
}

// Event Listeners
toggleBtn.addEventListener('click', async () => {
  const isActive = toggleBtn.classList.contains('active');
  const newState = !isActive;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TOGGLE_UNLOCK',
      payload: { tabId: currentTabId, enabled: newState },
    });
    setUnlockedState(response?.unlocked ?? newState, response?.protectionsRemoved || 0);
  } catch {
    setUnlockedState(newState);
  }
});

modeButtons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const mode = btn.dataset.mode || 'auto';
    setMode(mode);

    try {
      await chrome.runtime.sendMessage({
        type: 'SET_MODE',
        payload: { tabId: currentTabId, mode },
      });
    } catch {
      // Silently fail
    }
  });
});

openSidepanelBtn.addEventListener('click', async () => {
  try {
    if (chrome.sidePanel) {
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
    }
  } catch {
    // Fallback: open sidepanel page in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('src/sidepanel/sidepanel.html') });
  }
});

openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize
init();
