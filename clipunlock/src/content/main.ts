import type { UnlockMode, SiteProtectionProfile, MainWorldData, ExtensionSettings } from '../shared/types';
import type { Message } from '../shared/messages';
import { onMessage, sendMessage } from '../shared/messages';
import { getSettings, onSettingsChanged } from '../shared/storage';
import { detectProtections } from './detector';
import { applyUnlock, revertUnlock } from './unlocker';
import { CounterObserver } from './counter-observer';
import { startInterceptor, stopInterceptor, setWatermarkStripping, setCitationStyle, setPdfCleanup, setProStatus } from './clipboard-interceptor';
import { showLockAnimation } from './lock-animation';
import { show as showQuickPaste } from './quick-paste';
import { createLogger } from '../shared/logger';

const log = createLogger('main');

let currentProfile: SiteProtectionProfile | null = null;
let isUnlocked = false;
let currentMode: UnlockMode = 'auto';
let showNotifications = true;
const counterObserver = new CounterObserver();

// Helper: dispatch command to MAIN world page-world.ts via CustomEvent
function dispatchToPageWorld(action: string): void {
  window.dispatchEvent(new CustomEvent('__copyunlock_cmd', { detail: { action } }));
}

// Bridge: request detection data from MAIN world (tracked listeners, document.onXxx, etc.)
function requestMainWorldData(): Promise<MainWorldData> {
  return new Promise((resolve) => {
    const fallback: MainWorldData = {
      trackedListeners: [],
      oncopy: false, oncut: false, onpaste: false,
      oncontextmenu: false, onselectstart: false,
      getSelectionOverridden: false,
    };
    let resolved = false;
    const handler = (e: Event) => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('__copyunlock_report', handler);
      resolve((e as CustomEvent).detail ?? fallback);
    };
    window.addEventListener('__copyunlock_report', handler);
    dispatchToPageWorld('get-detection-data');
    // Timeout: if MAIN world doesn't respond in 150ms, use empty data
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('__copyunlock_report', handler);
        resolve(fallback);
      }
    }, 150);
  });
}

async function runDetection(): Promise<SiteProtectionProfile> {
  log.info('running detection on', location.hostname);
  const mwData = await requestMainWorldData();
  currentProfile = await detectProtections(currentMode, mwData);
  sendMessage({ type: 'DETECTION_RESULT', payload: { tabId: 0, profile: currentProfile } }).catch(() => {});
  return currentProfile;
}

function showUnlockNotification(steps: number): void {
  if (!showNotifications || !isTopFrame) return;
  const existing = document.getElementById('__copyunlock-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = '__copyunlock-toast';
  const msg = chrome.i18n.getMessage('popupProtections', [String(steps)]) || `${steps} protections removed`;
  toast.textContent = `\u{1F513} ${msg}`;
  toast.setAttribute('style', 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#1e293b;color:#f8fafc;padding:10px 18px;border-radius:8px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .3s;pointer-events:none;');
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function runUnlock(profile: SiteProtectionProfile): void {
  const result = applyUnlock(profile);
  isUnlocked = true;
  if (currentMode === 'auto' || currentMode === 'aggressive') {
    counterObserver.start(profile);
  }
  log.info(`unlock applied: ${result.appliedSteps} steps, ${result.errors.length} errors`);
  sendMessage({ type: 'UNLOCK_APPLIED', payload: { tabId: 0, steps: result.appliedSteps, errors: result.errors } }).catch(() => {});
  showUnlockNotification(result.appliedSteps);
}

function runRevert(): void {
  revertUnlock();
  // Tell MAIN world to revert prototype patches
  dispatchToPageWorld('revert');
  counterObserver.stop();
  isUnlocked = false;
  currentProfile = null;
  log.info('unlock reverted');
}

// Only the top frame should handle toggle/animation — prevents duplicate overlays in iframes
const isTopFrame = window === window.top;

onMessage((msg: Message, _sender, sendResponse) => {
  const { type, payload } = msg;
  switch (type) {
    case 'TOGGLE_UNLOCK': {
      // Only the top frame handles toggle and shows the animation.
      // Iframes ignore TOGGLE_UNLOCK to prevent duplicate overlays.
      if (!isTopFrame) {
        return;
      }
      if (isUnlocked) {
        runRevert();
        showLockAnimation(false);
        sendResponse({ unlocked: false });
      } else {
        runDetection().then((profile) => {
          if (profile.methods.length > 0) {
            runUnlock(profile);
          }
          // Always mark as unlocked on manual toggle — even if no protections detected.
          // This ensures the next toggle properly reverts instead of re-unlocking.
          isUnlocked = true;
          showLockAnimation(true);
          sendResponse({ unlocked: true, protectionsRemoved: profile.methods.length, profile });
        });
        return true;
      }
      break;
    }
    case 'SET_MODE': {
      if (!isTopFrame) {
        return;
      }
      const newMode = (payload as { mode: UnlockMode }).mode;
      currentMode = newMode;
      if (isUnlocked) {
        runRevert();
        runDetection().then((profile) => {
          if (profile.methods.length > 0) runUnlock(profile);
          sendResponse({ mode: newMode, unlocked: isUnlocked });
        });
        return true;
      }
      sendResponse({ mode: newMode });
      break;
    }
    case 'GET_TAB_STATE': {
      // Only the top frame reports state — prevents conflicting responses from iframes
      if (!isTopFrame) {
        return;
      }
      sendResponse({
        enabled: isUnlocked,
        unlocked: isUnlocked,
        mode: currentMode,
        profile: currentProfile,
        domain: location.hostname,
        protectionsRemoved: currentProfile?.methods.length ?? 0,
      });
      break;
    }
    case 'QUICK_PASTE_ITEMS': {
      // Triggered by Ctrl+Shift+V — show quick-paste overlay
      showQuickPaste();
      sendResponse({ ok: true });
      break;
    }
    case 'SETTINGS_CHANGED': {
      const changed = payload as Partial<ExtensionSettings>;
      if (changed.watermarkStripping !== undefined) setWatermarkStripping(changed.watermarkStripping);
      if (changed.autoCitation !== undefined) setCitationStyle(changed.autoCitation);
      if (changed.pdfCleanup !== undefined) setPdfCleanup(changed.pdfCleanup);
      if (changed.showNotifications !== undefined) showNotifications = changed.showNotifications;
      if (changed.clipboardHistoryEnabled !== undefined) {
        if (changed.clipboardHistoryEnabled) startInterceptor();
        else stopInterceptor();
      }
      sendResponse({ ok: true });
      break;
    }
    default:
      break;
  }
});

// Live-sync settings when user changes them in options page
onSettingsChanged((newSettings: ExtensionSettings) => {
  log.info('settings changed, syncing to content script');
  setWatermarkStripping(newSettings.watermarkStripping);
  setCitationStyle(newSettings.autoCitation);
  setPdfCleanup(newSettings.pdfCleanup);
  showNotifications = newSettings.showNotifications;
  if (newSettings.clipboardHistoryEnabled) {
    startInterceptor();
  } else {
    stopInterceptor();
  }
});

async function init(): Promise<void> {
  // No need to injectTracker — page-world.ts handles it automatically in MAIN world
  const settings = await getSettings();
  if (!settings.enabled) return;
  currentMode = settings.defaultMode;
  showNotifications = settings.showNotifications;
  setWatermarkStripping(settings.watermarkStripping);
  setCitationStyle(settings.autoCitation);
  setPdfCleanup(settings.pdfCleanup);

  // Fetch pro status for content script features (PDF cleanup, formatted citations)
  try {
    const proResult = await sendMessage({ type: 'GET_PRO_STATUS', payload: {} }) as { isPro?: boolean } | null;
    setProStatus(proResult?.isPro ?? false);
  } catch {
    setProStatus(false);
  }

  const domain = location.hostname;
  const override = settings.siteOverrides[domain];
  if (override) {
    if (!override.enabled) return;
    currentMode = override.mode;
  }
  if (settings.clipboardHistoryEnabled) {
    startInterceptor();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runDetection().then((profile) => {
        if (profile.methods.length > 0 && currentMode !== 'safe') {
          runUnlock(profile);
        }
      });
    });
  } else {
    const profile = await runDetection();
    if (profile.methods.length > 0 && currentMode !== 'safe') {
      runUnlock(profile);
    }
  }
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      log.info('SPA navigation detected, re-scanning');
      if (isUnlocked) runRevert();
      runDetection().then((profile) => {
        if (profile.methods.length > 0) runUnlock(profile);
      });
    }
  });
  urlObserver.observe(document.documentElement, { childList: true, subtree: true });
}

init().catch((err) => log.error('init failed:', err));
