import { DEFAULT_SETTINGS } from './types';
import type { ExtensionSettings } from './types';
import { STORAGE_SETTINGS } from './constants';

// ─── Typed wrapper around chrome.storage ───

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_SETTINGS);
  const stored = result[STORAGE_SETTINGS] as Partial<ExtensionSettings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.sync.set({ [STORAGE_SETTINGS]: merged });
}

export async function getLocal<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getSession<T>(key: string): Promise<T | undefined> {
  try {
    const result = await chrome.storage.session.get(key);
    return result[key] as T | undefined;
  } catch {
    // session storage not available in content scripts
    return undefined;
  }
}

export async function setSession<T>(key: string, value: T): Promise<void> {
  try {
    await chrome.storage.session.set({ [key]: value });
  } catch {
    // silently fail in content scripts
  }
}

export function onSettingsChanged(cb: (settings: ExtensionSettings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_SETTINGS]) {
      const newVal = changes[STORAGE_SETTINGS].newValue as ExtensionSettings;
      cb({ ...DEFAULT_SETTINGS, ...newVal });
    }
  });
}
