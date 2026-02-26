// Storage keys must match shared/constants.ts
const STORAGE_KEY = 'copyunlock_settings';
const STATS_KEY = 'copyunlock_stats';

// Settings interface matches shared/types.ts ExtensionSettings
interface Settings {
  enabled: boolean;
  defaultMode: string;
  showNotifications: boolean;
  theme: string;
  clipboardHistoryEnabled: boolean;
  maxItems: number;
  retentionDays: number;
  watermarkStripping: boolean;
  siteOverrides: Record<string, { enabled: boolean; mode: string }>;
}

interface Stats {
  totalUnlocks: number;
  totalCopies: number;
  totalWatermarks: number;
}

// DOM Refs
const enabledCheckbox = document.getElementById('enabled') as HTMLInputElement;
const defaultModeSelect = document.getElementById('default-mode') as HTMLSelectElement;
const notificationsCheckbox = document.getElementById('notifications') as HTMLInputElement;
// Theme removed — dark-by-design aesthetic
const clipboardEnabledCheckbox = document.getElementById('clipboard-enabled') as HTMLInputElement;
const maxItemsInput = document.getElementById('max-items') as HTMLInputElement;
const retentionDaysInput = document.getElementById('retention-days') as HTMLInputElement;
const watermarkStrippingCheckbox = document.getElementById('watermark-stripping') as HTMLInputElement;
const overridesList = document.getElementById('overrides-list') as HTMLDivElement;
const overrideDomainInput = document.getElementById('override-domain') as HTMLInputElement;
const overrideModeSelect = document.getElementById('override-mode') as HTMLSelectElement;
const addOverrideBtn = document.getElementById('add-override') as HTMLButtonElement;
const exportDataBtn = document.getElementById('export-data') as HTMLButtonElement;
const importDataBtn = document.getElementById('import-data') as HTMLButtonElement;
const importFileInput = document.getElementById('import-file') as HTMLInputElement;
const clearDataBtn = document.getElementById('clear-data') as HTMLButtonElement;
const configureShortcutsLink = document.getElementById('configure-shortcuts') as HTMLAnchorElement;
const proBadge = document.getElementById('pro-badge') as HTMLSpanElement;
const proActiveInfo = document.getElementById('pro-active-info') as HTMLDivElement;
const proUpgradeSection = document.getElementById('pro-upgrade-section') as HTMLDivElement;
const proPlanName = document.getElementById('pro-plan-name') as HTMLElement;
const planButtons = document.querySelectorAll('.plan-card') as NodeListOf<HTMLButtonElement>;
const refreshLicenseBtn = document.getElementById('refresh-license-btn') as HTMLButtonElement;
const refreshLicenseBtnFree = document.getElementById('refresh-license-btn-free') as HTMLButtonElement;
const proSupportSection = document.getElementById('pro-support-section') as HTMLDivElement;
const versionEl = document.getElementById('version') as HTMLSpanElement;
const statUnlocks = document.getElementById('stat-unlocks') as HTMLSpanElement;
const statCopies = document.getElementById('stat-copies') as HTMLSpanElement;
const statWatermarks = document.getElementById('stat-watermarks') as HTMLSpanElement;
const toast = document.getElementById('toast') as HTMLDivElement;
const navItems = document.querySelectorAll('.nav-item') as NodeListOf<HTMLButtonElement>;
const sectionPanels = document.querySelectorAll('.section-panel') as NodeListOf<HTMLElement>;

let currentSettings: Settings = {
  enabled: true,
  defaultMode: 'auto',
  showNotifications: true,
  theme: 'dark',
  clipboardHistoryEnabled: true,
  maxItems: 5000,
  retentionDays: 90,
  watermarkStripping: true,
  siteOverrides: {},
};

// ── Tab Navigation ──
navItems.forEach((navBtn) => {
  navBtn.addEventListener('click', () => {
    const sectionId = navBtn.dataset.section;
    if (!sectionId) return;

    navItems.forEach((n) => n.classList.remove('active'));
    navBtn.classList.add('active');

    sectionPanels.forEach((panel) => {
      if (panel.id === `section-${sectionId}`) {
        panel.classList.add('active');
        // Re-trigger animation
        panel.style.animation = 'none';
        panel.offsetHeight; // force reflow
        panel.style.animation = '';
      } else {
        panel.classList.remove('active');
      }
    });
  });
});

// Toast
function showToast(message: string, isError = false): void {
  toast.textContent = message;
  toast.classList.remove('hidden', 'error', 'success');
  if (isError) {
    toast.classList.add('error');
  } else {
    toast.classList.add('success');
  }
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// Load settings
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      currentSettings = { ...currentSettings, ...result[STORAGE_KEY] };
    }

    enabledCheckbox.checked = currentSettings.enabled;
    defaultModeSelect.value = currentSettings.defaultMode;
    notificationsCheckbox.checked = currentSettings.showNotifications;
    // theme is always 'dark'
    clipboardEnabledCheckbox.checked = currentSettings.clipboardHistoryEnabled;
    maxItemsInput.value = String(currentSettings.maxItems);
    retentionDaysInput.value = String(currentSettings.retentionDays);
    watermarkStrippingCheckbox.checked = currentSettings.watermarkStripping;

    renderOverrides();
  } catch {
    // Use defaults
  }
}

// Render overrides
function renderOverrides(): void {
  const domains = Object.keys(currentSettings.siteOverrides);
  if (domains.length === 0) {
    overridesList.innerHTML = '<div class="no-overrides">No site overrides configured.</div>';
    return;
  }

  overridesList.innerHTML = domains
    .map(
      (domain) => `
    <div class="override-row">
      <span class="override-domain">${escapeHtml(domain)}</span>
      <span class="override-mode-label">${currentSettings.siteOverrides[domain].mode}</span>
      <button class="override-remove" data-domain="${escapeHtml(domain)}" aria-label="Remove">&times;</button>
    </div>
  `
    )
    .join('');

  overridesList.querySelectorAll('.override-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const domain = (btn as HTMLElement).dataset.domain || '';
      delete currentSettings.siteOverrides[domain];
      save();
      renderOverrides();
    });
  });
}

// Load stats
async function loadStats(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STATS_KEY);
    const stats: Stats = result[STATS_KEY] || { totalUnlocks: 0, totalCopies: 0, totalWatermarks: 0 };
    statUnlocks.textContent = String(stats.totalUnlocks);
    statCopies.textContent = String(stats.totalCopies);
    statWatermarks.textContent = String(stats.totalWatermarks);
  } catch {
    // Use zeros
  }
}

// Load pro status
async function loadProStatus(): Promise<void> {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_PRO_STATUS', payload: {} });
    if (result?.isPro) {
      proBadge.classList.remove('hidden');
      proActiveInfo.classList.remove('hidden');
      proUpgradeSection.classList.add('hidden');
      if (proSupportSection) proSupportSection.classList.remove('hidden');
      // Pro users get full limits
      maxItemsInput.max = '100000';
      retentionDaysInput.max = '3650';
      const cache = await chrome.storage.local.get('copyunlock_license_cache');
      const cached = cache['copyunlock_license_cache'];
      if (cached?.plan) {
        proPlanName.textContent = cached.plan.charAt(0).toUpperCase() + cached.plan.slice(1);
      } else {
        proPlanName.textContent = 'Active';
      }
    } else {
      proActiveInfo.classList.add('hidden');
      proUpgradeSection.classList.remove('hidden');
      if (proSupportSection) proSupportSection.classList.add('hidden');
      // Free users get capped limits
      maxItemsInput.max = '200';
      retentionDaysInput.max = '30';
      // Clamp values down if needed
      if (parseInt(maxItemsInput.value, 10) > 200) maxItemsInput.value = '200';
      if (parseInt(retentionDaysInput.value, 10) > 30) retentionDaysInput.value = '30';
    }
  } catch {
    proActiveInfo.classList.add('hidden');
    proUpgradeSection.classList.remove('hidden');
    if (proSupportSection) proSupportSection.classList.add('hidden');
    maxItemsInput.max = '200';
    retentionDaysInput.max = '30';
  }
}

// Save
async function save(): Promise<void> {
  currentSettings.enabled = enabledCheckbox.checked;
  currentSettings.defaultMode = defaultModeSelect.value;
  currentSettings.showNotifications = notificationsCheckbox.checked;
  // theme stays 'dark'
  currentSettings.clipboardHistoryEnabled = clipboardEnabledCheckbox.checked;
  currentSettings.maxItems = parseInt(maxItemsInput.value, 10) || 5000;
  currentSettings.retentionDays = parseInt(retentionDaysInput.value, 10) || 90;
  currentSettings.watermarkStripping = watermarkStrippingCheckbox.checked;

  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: currentSettings });
    showToast(chrome.i18n.getMessage('settingsSaved') || 'Settings saved');
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: currentSettings }).catch(() => {});
  } catch {
    showToast('Failed to save settings', true);
  }
}

// Event listeners for form controls
enabledCheckbox.addEventListener('change', save);
defaultModeSelect.addEventListener('change', save);
notificationsCheckbox.addEventListener('change', save);

clipboardEnabledCheckbox.addEventListener('change', save);
maxItemsInput.addEventListener('change', save);
retentionDaysInput.addEventListener('change', save);
watermarkStrippingCheckbox.addEventListener('change', save);

// Add override
addOverrideBtn.addEventListener('click', () => {
  const domain = overrideDomainInput.value.trim();
  const mode = overrideModeSelect.value;
  if (!domain) return;

  currentSettings.siteOverrides[domain] = { enabled: mode !== 'disabled', mode: mode === 'disabled' ? 'auto' : mode };

  overrideDomainInput.value = '';
  save();
  renderOverrides();
});

// Export
exportDataBtn.addEventListener('click', async () => {
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
    showToast(chrome.i18n.getMessage('exportSuccess') || 'Data exported');
  } catch {
    showToast('Export failed', true);
  }
});

// Import
importDataBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.sync) {
      await chrome.storage.sync.set(data.sync);
    }
    if (data.local) {
      await chrome.storage.local.set(data.local);
    }

    showToast('Data imported successfully');
    loadSettings();
    loadStats();
  } catch {
    showToast('Import failed — invalid file', true);
  }

  importFileInput.value = '';
});

// Clear
clearDataBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all CopyUnlock data? This cannot be undone.')) return;

  try {
    // Clear clipboard history (IndexedDB) via service worker
    await chrome.runtime.sendMessage({ type: 'CLEAR_CLIPBOARD', payload: {} });
    // Clear settings and stats (chrome.storage)
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();
    showToast('All data cleared');
    loadSettings();
    loadStats();
  } catch {
    showToast('Failed to clear data', true);
  }
});

// Shortcuts
configureShortcutsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// Plan checkout buttons
planButtons.forEach((btn) => {
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

// Refresh license buttons
function handleRefreshLicense(): void {
  showToast('Checking license...');
  chrome.runtime.sendMessage({ type: 'CHECK_LICENSE', payload: {} }).then((result) => {
    if (result?.isPro) {
      showToast('Pro license verified!');
    } else {
      showToast('No active license found', true);
    }
    loadProStatus();
  }).catch(() => {
    showToast('License check failed', true);
  });
}

refreshLicenseBtn.addEventListener('click', handleRefreshLicense);
refreshLicenseBtnFree.addEventListener('click', handleRefreshLicense);

// Helpers
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Set version
const manifest = chrome.runtime.getManifest();
versionEl.textContent = manifest.version;

// Init
loadSettings();
loadStats();
loadProStatus();
