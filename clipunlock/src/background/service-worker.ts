import type { Message, ClipboardCapturePayload, ClipboardSearchPayload, ClipboardTagPayload } from '../shared/messages';
import type { ProStatus, ExtensionSettings } from '../shared/types';
import { onMessage } from '../shared/messages';
import { getSettings, saveSettings } from '../shared/storage';
import { addClipboardItem, getClipboardItems, getClipboardItem, searchClipboard, deleteClipboardItem, pinClipboardItem, tagClipboardItem, clearClipboard, cleanupExpired, getCollections, createCollection, deleteCollection, renameCollection, setItemCollection, getQuickPasteItems, createProject, updateProject, exportProjectAsText, exportProjectAsHtml } from './clipboard-store';
import { getProfile, clearProfile } from './site-profiles';
import { trackUnlock, trackCopy, trackSession } from './analytics';
import { ALARM_CLEANUP, ALARM_CLEANUP_INTERVAL_MIN, ALARM_LICENSE_CHECK, ALARM_LICENSE_CHECK_INTERVAL_MIN, LICENSE_API_BASE, EXTENSION_SLUG, LICENSE_CACHE_KEY, LICENSE_CACHE_TTL_MS, FREE_RETENTION_DAYS, PRO_RETENTION_DAYS } from '../shared/constants';
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

async function recheckAfterCheckout(_email: string): Promise<void> {
  // Small delay for webhook to process
  await new Promise((r) => setTimeout(r, 3000));
  // Clear cache and recheck
  await chrome.storage.local.remove(LICENSE_CACHE_KEY);
  await checkLicense();
  log.info(`post-checkout recheck: isPro=${proStatus.isPro}`);
}

// ─── Context Menu IDs ───
const CTX = {
  ROOT: 'copyunlock-root',
  TOGGLE: 'copyunlock-toggle',
  SEP_1: 'copyunlock-sep-1',
  COPY: 'copyunlock-copy',
  COPY_CLEAN: 'copyunlock-copy-clean',
  COPY_CITATION: 'copyunlock-copy-citation',
  SEP_2: 'copyunlock-sep-2',
  PIN: 'copyunlock-pin',
  COLLECTION_PARENT: 'copyunlock-collection',
  COLLECTION_NEW: 'copyunlock-collection-new',
  SEP_3: 'copyunlock-sep-3',
  MODE_PARENT: 'copyunlock-mode',
  MODE_AUTO: 'copyunlock-mode-auto',
  MODE_SAFE: 'copyunlock-mode-safe',
  MODE_AGGRESSIVE: 'copyunlock-mode-aggressive',
  SEP_4: 'copyunlock-sep-4',
  CLIPBOARD_HISTORY: 'copyunlock-clipboard-history',
  QUICK_PASTE: 'copyunlock-quick-paste',
  SEP_5: 'copyunlock-sep-5',
  SETTINGS: 'copyunlock-settings',
} as const;

// Collection menu item prefix — dynamic items get this prefix + collection id
const COLLECTION_ITEM_PREFIX = 'copyunlock-col-';

// Track current mode for radio button state
let contextMenuMode: import('../shared/types').UnlockMode = 'auto';

function setupContextMenus(): void {
  // Clear tracked collection IDs — removeAll wipes everything so the old IDs are gone
  activeCollectionMenuIds = [];
  collectionRefreshInProgress = false;
  collectionRefreshQueued = false;
  chrome.contextMenus.removeAll(() => {
    // ── Parent menu ──
    chrome.contextMenus.create({
      id: CTX.ROOT,
      title: 'CopyUnlock',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    // ── Toggle Page Unlock ──
    chrome.contextMenus.create({
      id: CTX.TOGGLE,
      parentId: CTX.ROOT,
      title: '\u{1F513} Unlock Page',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.SEP_1,
      parentId: CTX.ROOT,
      type: 'separator',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    // ── Copy actions (selection only) ──
    chrome.contextMenus.create({
      id: CTX.COPY,
      parentId: CTX.ROOT,
      title: 'Copy to History',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: CTX.COPY_CLEAN,
      parentId: CTX.ROOT,
      title: 'Copy Clean (strip watermarks)',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: CTX.COPY_CITATION,
      parentId: CTX.ROOT,
      title: 'Copy with Citation',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: CTX.SEP_2,
      parentId: CTX.ROOT,
      type: 'separator',
      contexts: ['selection'],
    });

    // ── Pin & Collection (selection only) ──
    chrome.contextMenus.create({
      id: CTX.PIN,
      parentId: CTX.ROOT,
      title: '\u{1F4CC} Pin Selection',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: CTX.COLLECTION_PARENT,
      parentId: CTX.ROOT,
      title: 'Save to Project',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: CTX.COLLECTION_NEW,
      parentId: CTX.COLLECTION_PARENT,
      title: '+ New Project...',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: CTX.SEP_3,
      parentId: CTX.ROOT,
      type: 'separator',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    // ── Mode submenu ──
    chrome.contextMenus.create({
      id: CTX.MODE_PARENT,
      parentId: CTX.ROOT,
      title: 'Mode',
      contexts: ['page', 'frame', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.MODE_AUTO,
      parentId: CTX.MODE_PARENT,
      title: 'Auto',
      type: 'radio',
      checked: contextMenuMode === 'auto',
      contexts: ['page', 'frame', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.MODE_SAFE,
      parentId: CTX.MODE_PARENT,
      title: 'Safe',
      type: 'radio',
      checked: contextMenuMode === 'safe',
      contexts: ['page', 'frame', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.MODE_AGGRESSIVE,
      parentId: CTX.MODE_PARENT,
      title: 'Aggressive',
      type: 'radio',
      checked: contextMenuMode === 'aggressive',
      contexts: ['page', 'frame', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.SEP_4,
      parentId: CTX.ROOT,
      type: 'separator',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    // ── Clipboard & Tools ──
    chrome.contextMenus.create({
      id: CTX.CLIPBOARD_HISTORY,
      parentId: CTX.ROOT,
      title: 'Clipboard History',
      contexts: ['page', 'frame', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.QUICK_PASTE,
      parentId: CTX.ROOT,
      title: 'Quick Paste',
      contexts: ['page', 'frame', 'editable'],
    });

    chrome.contextMenus.create({
      id: CTX.SEP_5,
      parentId: CTX.ROOT,
      type: 'separator',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    chrome.contextMenus.create({
      id: CTX.SETTINGS,
      parentId: CTX.ROOT,
      title: 'Settings',
      contexts: ['page', 'frame', 'selection', 'editable', 'image', 'video', 'audio'],
    });

    // Populate collection sub-items
    refreshCollectionMenuItems();
  });
}

// Track which dynamic collection menu items exist
let activeCollectionMenuIds: string[] = [];
let collectionRefreshInProgress = false;
let collectionRefreshQueued = false;

// Refresh collection items in the "Save to Collection" submenu
async function refreshCollectionMenuItems(): Promise<void> {
  // If a refresh is already running, queue one more and return
  if (collectionRefreshInProgress) {
    collectionRefreshQueued = true;
    return;
  }
  collectionRefreshInProgress = true;
  try {
    // Snapshot and clear immediately to prevent stale clicks during async removals
    const idsToRemove = [...activeCollectionMenuIds];
    activeCollectionMenuIds = [];
    // Remove previously created dynamic items — use callback to suppress runtime.lastError
    await Promise.allSettled(idsToRemove.map((id) => new Promise<void>((resolve) => {
      chrome.contextMenus.remove(id, () => {
        void chrome.runtime.lastError; // consume error to prevent console noise
        resolve();
      });
    })));
    // Fetch current collections and create menu items — projects first
    const collections = await getCollections();
    const projects = collections.filter((c) => c.isProject);
    const regularCollections = collections.filter((c) => !c.isProject);
    const newIds: string[] = [];

    // Helper: safely create a menu item — uses callback to suppress runtime.lastError
    const safeCreate = (props: chrome.contextMenus.CreateProperties): boolean => {
      try {
        chrome.contextMenus.create(props, () => {
          // Check runtime.lastError to suppress "duplicate id" console noise
          void chrome.runtime.lastError;
        });
        return true;
      } catch { return false; }
    };

    // Projects first with folder icon
    for (const proj of projects) {
      const id = COLLECTION_ITEM_PREFIX + proj.id;
      if (safeCreate({ id, parentId: CTX.COLLECTION_PARENT, title: `\u{1F4C1} ${proj.name}`, contexts: ['selection'] })) {
        newIds.push(id);
      }
    }

    // Separator between projects and collections
    if (projects.length > 0 && regularCollections.length > 0) {
      const sepId = 'copyunlock-col-sep';
      if (safeCreate({ id: sepId, parentId: CTX.COLLECTION_PARENT, type: 'separator', contexts: ['selection'] })) {
        newIds.push(sepId);
      }
    }

    // Regular collections
    for (const col of regularCollections) {
      const id = COLLECTION_ITEM_PREFIX + col.id;
      if (safeCreate({ id, parentId: CTX.COLLECTION_PARENT, title: col.name, contexts: ['selection'] })) {
        newIds.push(id);
      }
    }
    activeCollectionMenuIds = newIds;
  } finally {
    collectionRefreshInProgress = false;
    // If another refresh was requested while we were working, do it now
    if (collectionRefreshQueued) {
      collectionRefreshQueued = false;
      refreshCollectionMenuItems();
    }
  }
}

// Update toggle menu title based on tab unlock state
function updateToggleTitle(unlocked: boolean): void {
  const title = unlocked ? '\u{1F512} Lock Page (revert)' : '\u{1F513} Unlock Page';
  chrome.contextMenus.update(CTX.TOGGLE, { title }, () => { void chrome.runtime.lastError; });
}

// Update mode radio buttons to reflect current mode
function updateModeRadios(mode: import('../shared/types').UnlockMode): void {
  contextMenuMode = mode;
  const cb = () => { void chrome.runtime.lastError; };
  chrome.contextMenus.update(CTX.MODE_AUTO, { checked: mode === 'auto' }, cb);
  chrome.contextMenus.update(CTX.MODE_SAFE, { checked: mode === 'safe' }, cb);
  chrome.contextMenus.update(CTX.MODE_AGGRESSIVE, { checked: mode === 'aggressive' }, cb);
}

// Helper: check if a tab URL supports content scripts
function isScriptableUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const menuId = String(info.menuItemId);

  // Guard: ignore clicks on menu items that may have been removed by a concurrent rebuild
  // This prevents "Cannot find menu item with id ..." errors from stale collection items
  if (menuId.startsWith(COLLECTION_ITEM_PREFIX) && !activeCollectionMenuIds.includes(menuId)) {
    log.warn('ignoring click on stale collection menu item:', menuId);
    refreshCollectionMenuItems();
    return;
  }

  // ── Toggle Page Unlock ──
  if (menuId === CTX.TOGGLE) {
    if (!isScriptableUrl(tab.url)) {
      log.info('cannot toggle on non-http page:', tab.url);
      return;
    }
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UNLOCK', payload: {} });
      const unlocked = response?.unlocked ?? false;
      chrome.action.setBadgeText({ text: unlocked ? '\u2713' : '', tabId: tab.id });
      if (unlocked) chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId: tab.id });
      updateToggleTitle(unlocked);
    } catch (err) {
      log.warn('content script not available, injecting dynamically:', err);
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['dist/content/main.js'] });
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UNLOCK', payload: {} });
        const unlocked = response?.unlocked ?? false;
        chrome.action.setBadgeText({ text: unlocked ? '\u2713' : '', tabId: tab.id });
        if (unlocked) chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId: tab.id });
        updateToggleTitle(unlocked);
      } catch {
        // Page doesn't support content scripts
      }
    }
    return;
  }

  // ── Copy actions ──
  if (menuId === CTX.COPY || menuId === CTX.COPY_CLEAN || menuId === CTX.COPY_CITATION) {
    const text = info.selectionText ?? '';
    if (!text) return;
    const isClean = menuId === CTX.COPY_CLEAN;
    const isCitation = menuId === CTX.COPY_CITATION;
    const addResult = await addClipboardItem({
      content: text,
      html: null,
      sourceUrl: tab.url ?? '',
      sourceTitle: tab.title ?? '',
      wasUnlocked: false,
      watermarkStripped: isClean,
    }, proStatus);
    // For citation copy, write text + citation to clipboard via offscreen
    if (isCitation && addResult) {
      try {
        await ensureOffscreen();
        const citation = addResult.entry.citation || tab.url || '';
        const textWithCitation = `${text}\n\n— ${citation}`;
        await chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY', payload: { text: textWithCitation } });
      } catch (err) {
        log.error('citation copy failed:', err);
      }
    }
    return;
  }

  // ── Pin Selection ──
  if (menuId === CTX.PIN) {
    const text = info.selectionText ?? '';
    if (!text) return;
    const pinResult = await addClipboardItem({
      content: text,
      html: null,
      sourceUrl: tab.url ?? '',
      sourceTitle: tab.title ?? '',
      wasUnlocked: false,
      watermarkStripped: false,
    }, proStatus);
    if (pinResult) {
      await pinClipboardItem(pinResult.entry.id, true, proStatus);
    }
    return;
  }

  // ── Save to Project/Collection (dynamic items) ──
  if (menuId.startsWith(COLLECTION_ITEM_PREFIX)) {
    const collectionId = menuId.slice(COLLECTION_ITEM_PREFIX.length);
    // Verify this collection still exists (menu item may be stale from a race condition)
    const collections = await getCollections();
    if (!collections.some((c) => c.id === collectionId)) {
      log.warn('stale collection menu item clicked, refreshing menus');
      refreshCollectionMenuItems();
      return;
    }
    const text = info.selectionText ?? '';
    if (!text) return;
    const result = await addClipboardItem({
      content: text,
      html: null,
      sourceUrl: tab.url ?? '',
      sourceTitle: tab.title ?? '',
      wasUnlocked: false,
      watermarkStripped: false,
    }, proStatus);
    if (result) {
      await setItemCollection(result.entry.id, collectionId);
    }
    return;
  }

  // ── New Project (from right-click) ──
  if (menuId === CTX.COLLECTION_NEW) {
    const text = info.selectionText ?? '';
    if (!text) return;
    // Save the item first, then create a project with the current domain
    const addResult = await addClipboardItem({
      content: text,
      html: null,
      sourceUrl: tab.url ?? '',
      sourceTitle: tab.title ?? '',
      wasUnlocked: false,
      watermarkStripped: false,
    }, proStatus);
    if (addResult) {
      const domain = tab.url ? new URL(tab.url).hostname.replace('www.', '') : 'Untitled';
      const result = await createProject(domain, [domain], '', proStatus);
      if (result.ok && result.collection) {
        await setItemCollection(addResult.entry.id, result.collection.id);
        refreshCollectionMenuItems();
      }
    }
    return;
  }

  // ── Mode radio items ──
  if (menuId === CTX.MODE_AUTO || menuId === CTX.MODE_SAFE || menuId === CTX.MODE_AGGRESSIVE) {
    const modeMap: Record<string, import('../shared/types').UnlockMode> = {
      [CTX.MODE_AUTO]: 'auto',
      [CTX.MODE_SAFE]: 'safe',
      [CTX.MODE_AGGRESSIVE]: 'aggressive',
    };
    const newMode = modeMap[menuId] ?? 'auto';
    contextMenuMode = newMode;
    // Persist to settings
    const settings = await getSettings();
    settings.defaultMode = newMode;
    await saveSettings(settings);
    // Apply to current tab if scriptable
    if (isScriptableUrl(tab.url)) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SET_MODE', payload: { mode: newMode } });
      } catch {
        // Content script not available
      }
    }
    return;
  }

  // ── Clipboard History ──
  if (menuId === CTX.CLIPBOARD_HISTORY) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    return;
  }

  // ── Quick Paste ──
  if (menuId === CTX.QUICK_PASTE) {
    if (!isScriptableUrl(tab.url)) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'QUICK_PASTE_ITEMS', payload: { limit: 10 } });
    } catch {
      // Content script not available
    }
    return;
  }

  // ── Settings ──
  if (menuId === CTX.SETTINGS) {
    chrome.runtime.openOptionsPage();
    return;
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_CLEANUP) {
    const maxRetention = proStatus.isPro ? PRO_RETENTION_DAYS : FREE_RETENTION_DAYS;
    const settings = await getSettings();
    // Use the stricter of user setting and plan limit
    const effectiveRetention = Math.min(settings.retentionDays, maxRetention);
    await cleanupExpired(effectiveRetention);
    log.info(`cleanup alarm fired (retention: ${effectiveRetention}d, plan max: ${maxRetention}d)`);
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
      if (!isScriptableUrl(tab.url)) break;
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UNLOCK', payload: {} }).catch(() => {});
      break;
    case 'open-clipboard':
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      break;
    case 'search-clipboard':
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      break;
    case 'quick-paste':
      if (!isScriptableUrl(tab.url)) break;
      chrome.tabs.sendMessage(tab.id, { type: 'QUICK_PASTE_ITEMS', payload: { limit: 10 } }).catch(() => {});
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
      getActiveTabId(p?.tabId).then(async (tid) => {
        if (!tid) {
          sendResponse({ unlocked: false });
          return;
        }
        // Check if tab has a scriptable URL
        try {
          const tabInfo = await chrome.tabs.get(tid);
          if (!isScriptableUrl(tabInfo.url)) {
            sendResponse({ unlocked: false, error: 'Cannot unlock this page type' });
            return;
          }
        } catch {
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
      addClipboardItem({
        content: data.content,
        html: data.html,
        sourceUrl: data.sourceUrl,
        sourceTitle: data.sourceTitle,
        wasUnlocked: data.wasUnlocked,
        watermarkStripped: data.watermarkStripped,
        citation: data.citation ?? null,
        pdfCleaned: data.pdfCleaned ?? false,
        contentTypeOverride: data.contentTypeOverride,
      }, proStatus).then((result) => {
        if (!result) {
          sendResponse({ success: false, error: 'duplicate or too large' });
          return;
        }
        trackCopy(data.watermarkStripped);
        sendResponse({ success: true, entry: result.entry, limitWarning: result.limitWarning });
      }).catch((err) => {
        log.error('clipboard capture failed:', err);
        sendResponse({ success: false, error: String(err) });
      });
      return true;
    }
    case 'COPY_ITEM': {
      const { id, format: explicitFormat } = payload as { id: string; format?: string };
      getClipboardItem(id).then(async (item) => {
        if (!item) {
          sendResponse({ success: false, error: 'item not found' });
          return;
        }
        try {
          await ensureOffscreen();
          // Use explicit format if provided, otherwise fall back to user's default paste format setting
          const settings = await getSettings();
          const fmt = explicitFormat || settings.defaultPasteFormat || 'plain';
          let textToCopy = item.content;
          if (fmt === 'with-citation' && item.citation) {
            textToCopy = `${item.content}\n\n— ${item.citation}`;
          } else if (fmt === 'clean') {
            textToCopy = item.content.replace(/\s+/g, ' ').trim();
          }
          // 'plain' and 'rich' both copy content as-is
          const result = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY', payload: { text: textToCopy } });
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
      pinClipboardItem(id, pinned, proStatus).then((result) => sendResponse(result));
      return true;
    }
    case 'TAG_CLIPBOARD_ITEM': {
      const { id, tags } = payload as ClipboardTagPayload;
      tagClipboardItem(id, tags, proStatus).then((result) => sendResponse(result));
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
      const updatedSettings = payload as Partial<ExtensionSettings>;
      // React to context menu toggle
      if (updatedSettings.contextMenuEnabled === false) {
        chrome.contextMenus.removeAll(() => {});
      } else if (updatedSettings.contextMenuEnabled === true) {
        setupContextMenus();
      }
      // React to mode change
      if (updatedSettings.defaultMode) {
        updateModeRadios(updatedSettings.defaultMode);
      }
      saveSettings(updatedSettings).then(() => {
        // Broadcast to all content scripts so changes take effect immediately
        chrome.tabs.query({}).then((tabs) => {
          for (const t of tabs) {
            if (t.id && isScriptableUrl(t.url)) {
              chrome.tabs.sendMessage(t.id, { type: 'SETTINGS_CHANGED', payload: updatedSettings }).catch(() => {});
            }
          }
        });
        sendResponse({ ok: true });
      });
      return true;
    }
    case 'SETTINGS_CHANGED': {
      // Options page notifies us settings changed — sync mode radios & context menu visibility
      const changedSettings = payload as Partial<ExtensionSettings>;
      if (changedSettings.defaultMode) {
        updateModeRadios(changedSettings.defaultMode);
      }
      if (changedSettings.contextMenuEnabled === false) {
        chrome.contextMenus.removeAll(() => {});
      } else if (changedSettings.contextMenuEnabled === true) {
        setupContextMenus();
      }
      saveSettings(changedSettings).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: true }));
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

    case 'OPEN_BILLING_PORTAL': {
      getUserEmail().then(async (email) => {
        if (!email) {
          sendResponse({ ok: false, error: 'no email' });
          return;
        }
        try {
          const resp = await fetch(`${LICENSE_API_BASE}/api/billing-portal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, extensionSlug: EXTENSION_SLUG }),
          });
          if (!resp.ok) throw new Error(`Portal API returned ${resp.status}`);
          const data = await resp.json() as { url?: string };
          if (data.url) {
            chrome.tabs.create({ url: data.url });
            sendResponse({ ok: true, url: data.url });
          } else {
            sendResponse({ ok: false, error: 'no portal URL returned' });
          }
        } catch (err) {
          log.error('billing portal failed:', err);
          // Fallback: open Stripe direct customer portal or email support
          chrome.tabs.create({ url: 'mailto:support@peaktools.dev?subject=CopyUnlock%20Subscription%20Management' });
          sendResponse({ ok: false, error: String(err) });
        }
      });
      return true;
    }

    // ─── Paste item (with format support) ───
    case 'PASTE_ITEM': {
      const { id, format } = payload as { id: string; format?: string };
      getClipboardItem(id).then(async (item) => {
        if (!item) {
          sendResponse({ success: false, error: 'item not found' });
          return;
        }
        try {
          await ensureOffscreen();
          let textToCopy = item.content;

          if (format === 'with-citation' && item.citation) {
            textToCopy = `${item.content}\n\n— ${item.citation}`;
          } else if (format === 'clean') {
            // Strip all formatting: collapse whitespace, trim
            textToCopy = item.content.replace(/\s+/g, ' ').trim();
          }
          // 'plain' and 'rich' both just copy the content; rich would use HTML if available
          // For rich paste, we'd need the offscreen doc to handle text/html, but for now plain works

          const result = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY', payload: { text: textToCopy } });
          sendResponse({ success: result?.success ?? false, text: textToCopy });
        } catch (err) {
          log.error('paste item failed:', err);
          sendResponse({ success: false, error: String(err) });
        }
      });
      return true;
    }

    // ─── Collections ───
    case 'GET_COLLECTIONS': {
      getCollections().then((collections) => sendResponse(collections));
      return true;
    }
    case 'CREATE_COLLECTION': {
      const { name } = payload as { name: string };
      createCollection(name, proStatus).then((result) => {
        refreshCollectionMenuItems();
        sendResponse(result);
      });
      return true;
    }
    case 'DELETE_COLLECTION': {
      const { id } = payload as { id: string };
      deleteCollection(id).then(() => {
        refreshCollectionMenuItems();
        sendResponse({ ok: true });
      });
      return true;
    }
    case 'RENAME_COLLECTION': {
      const { id, name } = payload as { id: string; name: string };
      renameCollection(id, name).then((result) => {
        refreshCollectionMenuItems();
        sendResponse(result);
      });
      return true;
    }
    case 'SET_ITEM_COLLECTION': {
      const { itemId, collectionId } = payload as { itemId: string; collectionId: string | null };
      setItemCollection(itemId, collectionId).then((result) => sendResponse(result));
      return true;
    }

    // ─── Projects ───
    case 'CREATE_PROJECT': {
      const { name, domains, description } = payload as { name: string; domains: string[]; description: string };
      createProject(name, domains, description, proStatus).then((result) => {
        refreshCollectionMenuItems();
        sendResponse(result);
      });
      return true;
    }
    case 'UPDATE_PROJECT': {
      const { id: projId, updates } = payload as { id: string; updates: { name?: string; domains?: string[]; description?: string } };
      updateProject(projId, updates).then((result) => {
        refreshCollectionMenuItems();
        sendResponse(result);
      });
      return true;
    }
    case 'EXPORT_PROJECT': {
      const { id: exportId, format } = payload as { id: string; format: 'text' | 'html' };
      const exportFn = format === 'html' ? exportProjectAsHtml : exportProjectAsText;
      exportFn(exportId).then((content) => {
        sendResponse({ ok: true, content, format });
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    // ─── Quick-paste items ───
    case 'QUICK_PASTE_ITEMS': {
      const { limit } = (payload as { limit?: number }) ?? {};
      getQuickPasteItems(limit || 10).then((items) => sendResponse(items));
      return true;
    }

    // ─── Citation ───
    case 'GET_CITATION': {
      const { id: citId } = payload as { id: string };
      getClipboardItem(citId).then((item) => {
        if (!item) {
          sendResponse({ citation: null });
          return;
        }
        sendResponse({ citation: item.citation });
      });
      return true;
    }

    default:
      sendResponse({ error: 'unknown message type' });
  }
});

// Sync context menu state when switching tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!isScriptableUrl(tab.url)) {
      updateToggleTitle(false);
      return;
    }
    const response = await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'GET_TAB_STATE', payload: {} });
    updateToggleTitle(response?.unlocked ?? false);
    if (response?.mode) {
      updateModeRadios(response.mode);
    }
  } catch {
    updateToggleTitle(false);
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  log.info(`installed: ${details.reason}`);
  const settings = await getSettings();
  contextMenuMode = settings.defaultMode;
  if (settings.contextMenuEnabled !== false) {
    setupContextMenus();
  }
  chrome.alarms.create(ALARM_CLEANUP, { periodInMinutes: ALARM_CLEANUP_INTERVAL_MIN });
  chrome.alarms.create(ALARM_LICENSE_CHECK, { periodInMinutes: ALARM_LICENSE_CHECK_INTERVAL_MIN });
  await checkLicense();
  await trackSession();
});

chrome.runtime.onStartup.addListener(async () => {
  log.info('startup');
  const settings = await getSettings();
  contextMenuMode = settings.defaultMode;
  if (settings.contextMenuEnabled !== false) {
    setupContextMenus();
  }
  chrome.alarms.create(ALARM_CLEANUP, { periodInMinutes: ALARM_CLEANUP_INTERVAL_MIN });
  chrome.alarms.create(ALARM_LICENSE_CHECK, { periodInMinutes: ALARM_LICENSE_CHECK_INTERVAL_MIN });
  await checkLicense();
  await trackSession();
});
