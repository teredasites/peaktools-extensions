import type { UnlockMode, SiteProtectionProfile, MainWorldData } from '../shared/types';
import type { Message } from '../shared/messages';
import { onMessage, sendMessage } from '../shared/messages';
import { getSettings } from '../shared/storage';
import { detectProtections } from './detector';
import { applyUnlock, revertUnlock } from './unlocker';
import { CounterObserver } from './counter-observer';
import { startInterceptor, stopInterceptor, setWatermarkStripping } from './clipboard-interceptor';
import { showLockAnimation } from './lock-animation';
import { createLogger } from '../shared/logger';

const log = createLogger('main');

let currentProfile: SiteProtectionProfile | null = null;
let isUnlocked = false;
let currentMode: UnlockMode = 'auto';
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

function runUnlock(profile: SiteProtectionProfile): void {
  const result = applyUnlock(profile);
  isUnlocked = true;
  if (currentMode === 'auto' || currentMode === 'aggressive') {
    counterObserver.start(profile);
  }
  log.info(`unlock applied: ${result.appliedSteps} steps, ${result.errors.length} errors`);
  sendMessage({ type: 'UNLOCK_APPLIED', payload: { tabId: 0, steps: result.appliedSteps, errors: result.errors } }).catch(() => {});
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

onMessage((msg: Message, _sender, sendResponse) => {
  const { type, payload } = msg;
  switch (type) {
    case 'TOGGLE_UNLOCK': {
      if (isUnlocked) {
        runRevert();
        showLockAnimation(false);
        sendResponse({ unlocked: false });
      } else {
        runDetection().then((profile) => {
          // Show animation BEFORE starting CounterObserver so it doesn't get killed
          showLockAnimation(true);
          if (profile.methods.length > 0) {
            runUnlock(profile);
          }
          sendResponse({ unlocked: isUnlocked, protectionsRemoved: profile.methods.length, profile });
        });
        return true;
      }
      break;
    }
    case 'SET_MODE': {
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
    default:
      break;
  }
});

async function init(): Promise<void> {
  // No need to injectTracker — page-world.ts handles it automatically in MAIN world
  const settings = await getSettings();
  if (!settings.enabled) return;
  currentMode = settings.defaultMode;
  setWatermarkStripping(settings.watermarkStripping);
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
