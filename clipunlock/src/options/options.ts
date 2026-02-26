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
const themeSelect = document.getElementById('theme') as HTMLSelectElement;
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
const planButtons = document.querySelectorAll('.plan-btn') as NodeListOf<HTMLButtonElement>;
const refreshLicenseBtn = document.getElementById('refresh-license-btn') as HTMLButtonElement;
const refreshLicenseBtnFree = document.getElementById('refresh-license-btn-free') as HTMLButtonElement;
const versionEl = document.getElementById('version') as HTMLSpanElement;
const statUnlocks = document.getElementById('stat-unlocks') as HTMLSpanElement;
const statCopies = document.getElementById('stat-copies') as HTMLSpanElement;
const statWatermarks = document.getElementById('stat-watermarks') as HTMLSpanElement;
const toast = document.getElementById('toast') as HTMLDivElement;

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

// Toast
function showToast(message: string, isError = false): void {
  toast.textContent = message;
  toast.classList.remove('hidden', 'error');
  if (isError) toast.classList.add('error');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// Load settings — uses correct storage key
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      currentSettings = { ...currentSettings, ...result[STORAGE_KEY] };
    }

    enabledCheckbox.checked = currentSettings.enabled;
    defaultModeSelect.value = currentSettings.defaultMode;
    notificationsCheckbox.checked = currentSettings.showNotifications;
    themeSelect.value = currentSettings.theme;
    clipboardEnabledCheckbox.checked = currentSettings.clipboardHistoryEnabled;
    maxItemsInput.value = String(currentSettings.maxItems);
    retentionDaysInput.value = String(currentSettings.retentionDays);
    watermarkStrippingCheckbox.checked = currentSettings.watermarkStripping;

    renderOverrides();
  } catch {
    // Use defaults
  }
}

// Render overrides — Record<string, {enabled, mode}> format
function renderOverrides(): void {
  const domains = Object.keys(currentSettings.siteOverrides);
  if (domains.length === 0) {
    overridesList.innerHTML = '<p class="section-desc">No site overrides configured.</p>';
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

// Load stats — uses correct storage key
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
      // Try to get plan name from cache
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
    }
  } catch {
    // Use free status — show upgrade section
    proActiveInfo.classList.add('hidden');
    proUpgradeSection.classList.remove('hidden');
  }
}

// Save — uses correct storage key and field names
async function save(): Promise<void> {
  currentSettings.enabled = enabledCheckbox.checked;
  currentSettings.defaultMode = defaultModeSelect.value;
  currentSettings.showNotifications = notificationsCheckbox.checked;
  currentSettings.theme = themeSelect.value;
  currentSettings.clipboardHistoryEnabled = clipboardEnabledCheckbox.checked;
  currentSettings.maxItems = parseInt(maxItemsInput.value, 10) || 5000;
  currentSettings.retentionDays = parseInt(retentionDaysInput.value, 10) || 90;
  currentSettings.watermarkStripping = watermarkStrippingCheckbox.checked;

  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: currentSettings });
    showToast(chrome.i18n.getMessage('settingsSaved') || 'Settings saved');
    // Notify background of settings change
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: currentSettings }).catch(() => {});
  } catch (err) {
    showToast('Failed to save settings', true);
  }
}

// Event listeners for form controls
enabledCheckbox.addEventListener('change', save);
defaultModeSelect.addEventListener('change', save);
notificationsCheckbox.addEventListener('change', save);
themeSelect.addEventListener('change', save);
clipboardEnabledCheckbox.addEventListener('change', save);
maxItemsInput.addEventListener('change', save);
retentionDaysInput.addEventListener('change', save);
watermarkStrippingCheckbox.addEventListener('change', save);

// Add override — Record format
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
    showToast(chrome.i18n.getMessage('exportSuccess') || 'Data exported successfully');
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
    showToast('Import failed - invalid file', true);
  }

  importFileInput.value = '';
});

// Clear
clearDataBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all CopyUnlock data? This cannot be undone.')) return;

  try {
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

// Plan checkout buttons (monthly, annual, lifetime)
planButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const plan = btn.dataset.plan || 'monthly';
    btn.disabled = true;
    btn.textContent = 'Opening checkout...';
    chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', payload: { plan } }).then(() => {
      setTimeout(() => {
        btn.disabled = false;
        if (plan === 'monthly') btn.textContent = '$3.99/month';
        else if (plan === 'annual') btn.innerHTML = '$29.99/year <span class="plan-save">Save 37%</span>';
        else btn.textContent = '$49.99 lifetime';
      }, 3000);
    });
  });
});

// Refresh license buttons (for both pro-active and free views)
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
