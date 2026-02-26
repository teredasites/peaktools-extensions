import type { Message, ClipboardCapturePayload, ClipboardSearchPayload, ClipboardTagPayload } from '../shared/messages';
import type { ProStatus, ExtensionSettings } from '../shared/types';
import { onMessage } from '../shared/messages';
import { getSettings, saveSettings } from '../shared/storage';
import { addClipboardItem, getClipboardItems, searchClipboard, deleteClipboardItem, pinClipboardItem, tagClipboardItem, clearClipboard, cleanupExpired, exportClipboard, importClipboard } from './clipboard-store';
import { getProfile, saveProfile, clearProfile } from './site-profiles';
import { trackUnlock, trackCopy, trackSession, getUsageStats } from './analytics';
import { ALARM_CLEANUP, ALARM_CLEANUP_INTERVAL_MIN, ALARM_LICENSE_CHECK, ALARM_LICENSE_CHECK_INTERVAL_MIN, LICENSE_API_BASE, EXTENSION_SLUG, LICENSE_CACHE_KEY, LICENSE_CACHE_TTL_MS } from '../shared/constants';
import { createLogger } from '../shared/logger';

const log = createLogger('service-worker');

let proStatus: ProStatus = { isPro: false, trialActive: false, trialDaysLeft: 0 };

// License readiness gate — all Pro-dependent code awaits this before responding
// Prevents race condition where GET_PRO_STATUS arrives before checkLicense() resolves
let licenseReadyResolve: () => void;
let licenseReady: Promise<void> = new Promise((r) => { licenseReadyResolve = r; });

// ─── License System — Real Stripe via PeakTools License Worker ───

interface LicenseCacheEntry {
  proStatus: ProStatus;
  email: string;
  plan: string | null;
  expiresAt: string | null;
  cachedAt: number;
}

async function getUserEmail(): Promise<string | null> {
  try {
    const info = await chrome.identity.getProfileUserInfo({ accountStatus: chrome.identity.AccountStatus.ANY as chrome.identity.AccountStatus });
    if (info?.email) return info.email.toLowerCase();
  } catch (err) {
    log.error('failed to get user email:', err);
  }
  return null;
}

async function getCachedLicense(): Promise<LicenseCacheEntry | null> {
  try {
    const result = await chrome.storage.local.get(LICENSE_CACHE_KEY);
    const cached = result[LICENSE_CACHE_KEY] as LicenseCacheEntry | undefined;
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > LICENSE_CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

async function getCachedLicenseStale(): Promise<LicenseCacheEntry | null> {
  try {
    const result = await chrome.storage.local.get(LICENSE_CACHE_KEY);
    return (result[LICENSE_CACHE_KEY] as LicenseCacheEntry) ?? null;
  } catch {
    return null;
  }
}

async function cacheLicense(entry: LicenseCacheEntry): Promise<void> {
  try {
    await chrome.storage.local.set({ [LICENSE_CACHE_KEY]: entry });
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

async function checkLicenseFromAPI(email: string): Promise<{ active: boolean; plan?: string; expiresAt?: string }> {
  const url = `${LICENSE_API_BASE}/api/license?email=${encodeURIComponent(email)}&ext=${EXTENSION_SLUG}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) {
    throw new Error(`License API returned ${resp.status}`);
  }
  return resp.json();
}

async function checkLicense(): Promise<void> {
  // Try cache first
  const cached = await getCachedLicense();
  if (cached) {
    // Validate expiry even from cache
    if (cached.expiresAt) {
      const expiry = new Date(cached.expiresAt);
      if (expiry < new Date()) {
        log.info('cached license expired, clearing cache');
        await chrome.storage.local.remove(LICENSE_CACHE_KEY);
        // Fall through to API check
      } else {
        proStatus = cached.proStatus;
        log.info(`license from cache: isPro=${proStatus.isPro}`);
        licenseReadyResolve();
        return;
      }
    } else {
      // No expiry = lifetime or free
      proStatus = cached.proStatus;
      log.info(`license from cache: isPro=${proStatus.isPro}`);
      licenseReadyResolve();
      return;
    }
  }

  const email = await getUserEmail();
  if (!email) {
    proStatus = { isPro: false, trialActive: false, trialDaysLeft: 0 };
    log.info('no user email available — free tier');
    licenseReadyResolve();
    return;
  }

  // Retry logic: up to 3 attempts with exponential backoff
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await checkLicenseFromAPI(email);
      proStatus = {
        isPro: result.active === true,
        trialActive: false,
        trialDaysLeft: 0,
      };
      await cacheLicense({
        proStatus,
        email,
        plan: result.plan ?? null,
        expiresAt: result.expiresAt ?? null,
        cachedAt: Date.now(),
      });
      log.info(`license checked: isPro=${proStatus.isPro}, plan=${result.plan ?? 'none'}`);
      licenseReadyResolve();
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s
        log.warn(`license check attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  // All retries failed — check cache even if expired (stale is better than wrong)
  const staleCache = await getCachedLicenseStale();
  if (staleCache && staleCache.proStatus.isPro) {
    proStatus = staleCache.proStatus;
    log.warn('all retries failed, using stale cache (user is Pro)');
  } else {
    proStatus = { isPro: false, trialActive: false, trialDaysLeft: 0 };
    log.error('license check failed after 3 attempts, using free tier:', lastErr);
    // Cache a SHORT TTL so we retry sooner (5 minutes, not 24 hours)
    await cacheLicense({
      proStatus,
      email,
      plan: null,
      expiresAt: null,
      cachedAt: Date.now() - LICENSE_CACHE_TTL_MS + 5 * 60 * 1000, // expire in 5 min
    });
  }
  licenseReadyResolve();
}

async function openCheckout(plan: 'monthly' | 'annual' | 'lifetime'): Promise<string | null> {
  const email = await getUserEmail();
  if (!email) {
    // No Chrome profile email — open the website pricing page as fallback
    chrome.tabs.create({ url: `https://peaktools.dev/copyunlock/#pricing` });
    return null;
  }

  try {
    const resp = await fetch(`${LICENSE_API_BASE}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extensionSlug: EXTENSION_SLUG,
        plan,
        email,
      }),
    });
    if (!resp.ok) {
      throw new Error(`Checkout API returned ${resp.status}`);
    }
    const data = await resp.json() as { url?: string };
    if (data.url) {
      const tab = await chrome.tabs.create({ url: data.url });
      // Auto-recheck license when checkout tab closes or navigates to success URL
      startCheckoutWatcher(tab.id ?? 0, email);
      return data.url;
    }
  } catch (err) {
    log.error('checkout failed, falling back to website:', err);
    chrome.tabs.create({ url: `https://peaktools.dev/copyunlock/#pricing` });
  }
  return null;
}

// Watch for checkout completion — re-check license when user returns from Stripe
function startCheckoutWatcher(checkoutTabId: number, email: string): void {
  if (!checkoutTabId || checkoutTabId <= 0) return;

  let pollCount = 0;
  const MAX_POLLS = 30; // poll for up to 5 minutes (10s intervals)
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // Method 1: Watch for tab close
  const onRemoved = (tabId: number) => {
    if (tabId === checkoutTabId) {
      cleanup();
      recheckAfterCheckout(email);
    }
  };

  // Method 2: Watch for navigation to success URL
  const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
    if (tabId === checkoutTabId && changeInfo.url) {
      if (changeInfo.url.includes('peaktools.dev/success')) {
        cleanup();
        recheckAfterCheckout(email);
      } else if (changeInfo.url.includes('peaktools.dev/cancel')) {
        cleanup();
        log.info('checkout cancelled by user');
      }
    }
  };

  // Method 3: Poll the license API in case webhook fires while tab is still open
  pollTimer = setInterval(async () => {
    pollCount++;
    if (pollCount > MAX_POLLS) {
      cleanup();
      return;
    }
    try {
      const result = await checkLicenseFromAPI(email);
      if (result.active) {
        cleanup();
        proStatus = { isPro: true, trialActive: false, trialDaysLeft: 0 };
        await cacheLicense({
          proStatus,
          email,
          plan: result.plan ?? null,
          expiresAt: result.expiresAt ?? null,
          cachedAt: Date.now(),
        });
        log.info('checkout detected via polling — user is now Pro!');
      }
    } catch {
      // Polling failure is non-fatal
    }
  }, 10_000);

  chrome.tabs.onRemoved.addListener(onRemoved);
  chrome.tabs.onUpdated.addListener(onUpdated);

  function cleanup(): void {
    chrome.tabs.onRemoved.removeListener(onRemoved);
    chrome.tabs.onUpdated.removeListener(onUpdated);
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
}

async function recheckAfterCheckout(email: string): Promise<void> {
  // Small delay for webhook to process
  await new Promise((r) => setTimeout(r, 3000));
  // Clear cache and recheck
  await chrome.storage.local.remove(LICENSE_CACHE_KEY);
  await checkLicense();
  log.info(`post-checkout recheck: isPro=${proStatus.isPro}`);
}

function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    // Page-level entry — appears on ANY right-click
    chrome.contextMenus.create({
      id: 'copyunlock-toggle-page',
      title: chrome.i18n.getMessage('contextMenuUnlockPage') || 'Unlock Page with CopyUnlock',
      contexts: ['page', 'frame', 'editable', 'image', 'video', 'audio'],
    });
    chrome.contextMenus.create({
      id: 'copyunlock-copy',
      title: chrome.i18n.getMessage('contextMenuCopy') || 'Copy with CopyUnlock',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'copyunlock-copy-clean',
      title: chrome.i18n.getMessage('contextMenuCopyClean') || 'Copy Clean Text (strip watermarks)',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'copyunlock-pin',
      title: chrome.i18n.getMessage('contextMenuPin') || 'Pin to Clipboard History',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'copyunlock-search',
      title: chrome.i18n.getMessage('contextMenuSearch') || 'Search Clipboard History',
      contexts: ['action'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  switch (info.menuItemId) {
    case 'copyunlock-toggle-page': {
      // Send TOGGLE_UNLOCK to the content script on the active tab
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UNLOCK', payload: {} });
        if (response?.unlocked) {
          chrome.action.setBadgeText({ text: '\u2713', tabId: tab.id });
          chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId: tab.id });
          chrome.contextMenus.update('copyunlock-toggle-page', { title: 'CopyUnlock: ON \u2713' });
        } else {
          chrome.action.setBadgeText({ text: '', tabId: tab.id });
          chrome.contextMenus.update('copyunlock-toggle-page', { title: 'Unlock Page with CopyUnlock' });
        }
      } catch (err) {
        log.error('failed to toggle unlock via context menu:', err);
      }
      break;
    }
    case 'copyunlock-copy':
    case 'copyunlock-copy-clean':
    case 'copyunlock-pin': {
      const text = info.selectionText ?? '';
      if (!text) return;
      const entry = await addClipboardItem({
        content: text,
        html: null,
        sourceUrl: tab.url ?? '',
        sourceTitle: tab.title ?? '',
        wasUnlocked: false,
        watermarkStripped: info.menuItemId === 'copyunlock-copy-clean',
      }, proStatus);
      if (entry && info.menuItemId === 'copyunlock-pin') {
        await pinClipboardItem(entry.id, true);
      }
      break;
    }
    case 'copyunlock-search': {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      break;
    }
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_CLEANUP) {
    const settings = await getSettings();
    await cleanupExpired(settings.retentionDays);
    log.info('cleanup alarm fired');
  } else if (alarm.name === ALARM_LICENSE_CHECK) {
    // Clear cache so we fetch fresh from API
    await chrome.storage.local.remove(LICENSE_CACHE_KEY);
    await checkLicense();
    log.info('daily license check completed');
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;
  switch (command) {
    case 'toggle-unlock':
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UNLOCK', payload: {} });
      break;
    case 'open-clipboard':
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      break;
    case 'search-clipboard':
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      break;
  }
});

function updateBadge(tabId: number, methodCount: number, unlocked: boolean): void {
  if (!tabId || tabId <= 0) return;
  if (methodCount === 0) {
    chrome.action.setBadgeText({ text: '', tabId });
    return;
  }
  chrome.action.setBadgeText({ text: unlocked ? '\u2713' : String(methodCount), tabId });
  chrome.action.setBadgeBackgroundColor({
    color: unlocked ? '#3b82f6' : '#EF4444',
    tabId,
  });
}

// Helper: get active tab id for relay messages
async function getActiveTabId(payloadTabId?: number | null): Promise<number | null> {
  if (payloadTabId && payloadTabId > 0) return payloadTabId;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id ?? null;
  } catch {
    return null;
  }
}

// Helper: ensure offscreen document exists for clipboard operations
let offscreenCreating: Promise<void> | null = null;
async function ensureOffscreen(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT as chrome.runtime.ContextType],
  });
  if (existingContexts.length > 0) return;
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }
  offscreenCreating = chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.CLIPBOARD as chrome.offscreen.Reason],
    justification: 'Write to clipboard from service worker',
  });
  await offscreenCreating;
  offscreenCreating = null;
}

onMessage((msg: Message, sender, sendResponse) => {
  const { type, payload } = msg;
  const tabId = sender.tab?.id ?? 0;
  switch (type) {
    // ─── Relay messages to content script ───
    case 'GET_TAB_STATE': {
      const p = payload as { tabId?: number };
      getActiveTabId(p?.tabId).then((tid) => {
        if (!tid) {
          sendResponse({ enabled: false, mode: 'auto', profile: null, domain: '' });
          return;
        }
        chrome.tabs.sendMessage(tid, { type: 'GET_TAB_STATE', payload: {} })
          .then((response) => sendResponse(response))
          .catch(() => sendResponse({ enabled: false, mode: 'auto', profile: null, domain: '' }));
      });
      return true;
    }
    case 'TOGGLE_UNLOCK': {
      const p = payload as { tabId?: number; enabled?: boolean };
      getActiveTabId(p?.tabId).then((tid) => {
        if (!tid) {
          sendResponse({ unlocked: false });
          return;
        }
        chrome.tabs.sendMessage(tid, { type: 'TOGGLE_UNLOCK', payload: p })
          .then((response) => sendResponse(response))
          .catch(() => sendResponse({ unlocked: false }));
      });
      return true;
    }
    case 'SET_MODE': {
      const p = payload as { tabId?: number; mode?: string };
      getActiveTabId(p?.tabId).then((tid) => {
        if (!tid) {
          sendResponse({ mode: p?.mode || 'auto' });
          return;
        }
        chrome.tabs.sendMessage(tid, { type: 'SET_MODE', payload: p })
          .then((response) => sendResponse(response))
          .catch(() => sendResponse({ mode: p?.mode || 'auto' }));
      });
      return true;
    }

    // ─── Clipboard operations ───
    case 'CLIPBOARD_CAPTURE': {
      const data = payload as ClipboardCapturePayload;
      addClipboardItem(data, proStatus).then((entry) => {
        trackCopy(data.watermarkStripped);
        sendResponse({ success: true, entry });
      }).catch((err) => {
        log.error('clipboard capture failed:', err);
        sendResponse({ success: false, error: String(err) });
      });
      return true;
    }
    case 'COPY_ITEM': {
      const { id } = payload as { id: string };
      getClipboardItems(10000).then(async (items) => {
        const item = items.find((i) => i.id === id);
        if (!item) {
          sendResponse({ success: false, error: 'item not found' });
          return;
        }
        try {
          await ensureOffscreen();
          const result = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY', payload: { text: item.content } });
          sendResponse({ success: result?.success ?? false });
        } catch (err) {
          log.error('copy item failed:', err);
          sendResponse({ success: false, error: String(err) });
        }
      });
      return true;
    }
    case 'DETECTION_RESULT': {
      const { profile } = payload as { profile: { methods: { id: number }[] } };
      updateBadge(tabId, profile.methods.length, false);
      sendResponse({ ok: true });
      break;
    }
    case 'UNLOCK_APPLIED': {
      const { steps } = payload as { steps: number };
      updateBadge(tabId, steps, true);
      trackUnlock([]);
      sendResponse({ ok: true });
      break;
    }
    case 'GET_CLIPBOARD_HISTORY': {
      const { limit, offset } = (payload as { limit?: number; offset?: number }) ?? {};
      getClipboardItems(limit, offset).then((items) => sendResponse(items));
      return true;
    }
    case 'SEARCH_CLIPBOARD': {
      const { query, limit } = payload as ClipboardSearchPayload;
      searchClipboard(query, limit).then((items) => sendResponse(items));
      return true;
    }
    case 'DELETE_CLIPBOARD_ITEM': {
      const { id } = payload as { id: string };
      deleteClipboardItem(id).then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'PIN_CLIPBOARD_ITEM': {
      const { id, pinned } = payload as { id: string; pinned: boolean };
      pinClipboardItem(id, pinned).then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'TAG_CLIPBOARD_ITEM': {
      const { id, tags } = payload as ClipboardTagPayload;
      tagClipboardItem(id, tags).then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'CLEAR_CLIPBOARD': {
      clearClipboard().then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'GET_SETTINGS': {
      getSettings().then((s) => sendResponse(s));
      return true;
    }
    case 'UPDATE_SETTINGS': {
      saveSettings(payload as Partial<ExtensionSettings>).then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'SETTINGS_CHANGED': {
      // Options page notifies us settings changed — just acknowledge
      saveSettings(payload as Partial<ExtensionSettings>).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: true }));
      return true;
    }
    case 'GET_SITE_PROFILE': {
      const { domain } = payload as { domain: string };
      getProfile(domain).then((p) => sendResponse(p));
      return true;
    }
    case 'CLEAR_SITE_PROFILE': {
      const { domain } = payload as { domain: string };
      clearProfile(domain).then(() => sendResponse({ ok: true }));
      return true;
    }
    case 'GET_PRO_STATUS': {
      // Wait for initial license check to complete before responding
      licenseReady.then(() => sendResponse(proStatus));
      return true;
    }
    case 'CHECK_LICENSE': {
      // Force re-check license from API (clears cache)
      // Reset the license gate so subsequent GET_PRO_STATUS calls wait
      licenseReady = new Promise((r) => { licenseReadyResolve = r; });
      chrome.storage.local.remove(LICENSE_CACHE_KEY).then(() => {
        checkLicense().then(() => {
          sendResponse(proStatus);
        });
      });
      return true;
    }
    case 'OPEN_SIDEPANEL': {
      if (tabId > 0) {
        chrome.sidePanel.open({ tabId }).catch(() => {});
      } else {
        getActiveTabId().then((tid) => {
          if (tid) chrome.sidePanel.open({ tabId: tid }).catch(() => {});
        });
      }
      sendResponse({ ok: true });
      break;
    }
    case 'OPEN_CHECKOUT': {
      const { plan } = payload as { plan: 'monthly' | 'annual' | 'lifetime' };
      openCheckout(plan || 'monthly').then((url) => {
        sendResponse({ ok: true, url });
      });
      return true;
    }
    default:
      sendResponse({ error: 'unknown message type' });
  }
});

// Sync context menu title when switching tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const response = await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'GET_TAB_STATE', payload: {} });
    if (response?.unlocked) {
      chrome.contextMenus.update('copyunlock-toggle-page', { title: 'CopyUnlock: ON \u2713' });
    } else {
      chrome.contextMenus.update('copyunlock-toggle-page', { title: 'Unlock Page with CopyUnlock' });
    }
  } catch {
    // Content script not available on this tab (e.g. chrome:// pages)
    chrome.contextMenus.update('copyunlock-toggle-page', { title: 'Unlock Page with CopyUnlock' });
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  log.info(`installed: ${details.reason}`);
  setupContextMenus();
  chrome.alarms.create(ALARM_CLEANUP, { periodInMinutes: ALARM_CLEANUP_INTERVAL_MIN });
  chrome.alarms.create(ALARM_LICENSE_CHECK, { periodInMinutes: ALARM_LICENSE_CHECK_INTERVAL_MIN });
  await checkLicense();
  await trackSession();
});

chrome.runtime.onStartup.addListener(async () => {
  log.info('startup');
  setupContextMenus();
  chrome.alarms.create(ALARM_CLEANUP, { periodInMinutes: ALARM_CLEANUP_INTERVAL_MIN });
  chrome.alarms.create(ALARM_LICENSE_CHECK, { periodInMinutes: ALARM_LICENSE_CHECK_INTERVAL_MIN });
  await checkLicense();
  await trackSession();
});
