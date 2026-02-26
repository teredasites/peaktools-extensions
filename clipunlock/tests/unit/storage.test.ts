import '../setup';
import { chromeMock } from '../setup';

// Storage helper functions
interface DefaultSettings {
  enabled: boolean;
  defaultMode: string;
  notifications: boolean;
  theme: string;
  clipboardEnabled: boolean;
  maxItems: number;
  retentionDays: number;
  watermarkStripping: boolean;
  siteOverrides: Array<{ domain: string; mode: string }>;
}

const DEFAULT_SETTINGS: DefaultSettings = {
  enabled: true,
  defaultMode: 'auto',
  notifications: true,
  theme: 'dark',
  clipboardEnabled: true,
  maxItems: 500,
  retentionDays: 30,
  watermarkStripping: true,
  siteOverrides: [],
};

async function getSettings(): Promise<DefaultSettings> {
  const result = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
}

async function saveSettings(settings: Partial<DefaultSettings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.sync.set({ settings: merged });
}

async function getLocal<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

async function setLocal<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// Tests
describe('Storage', () => {
  beforeEach(() => {
    chromeMock.storage.sync.clear();
    chromeMock.storage.local.clear();
  });

  describe('getSettings', () => {
    it('should return default settings when nothing is stored', async () => {
      const settings = await getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.defaultMode).toBe('auto');
      expect(settings.notifications).toBe(true);
      expect(settings.theme).toBe('dark');
      expect(settings.clipboardEnabled).toBe(true);
      expect(settings.maxItems).toBe(500);
      expect(settings.retentionDays).toBe(30);
      expect(settings.watermarkStripping).toBe(true);
      expect(settings.siteOverrides).toEqual([]);
    });

    it('should merge partial stored settings with defaults', async () => {
      await chrome.storage.sync.set({
        settings: { defaultMode: 'aggressive', maxItems: 1000 },
      });

      const settings = await getSettings();
      expect(settings.defaultMode).toBe('aggressive');
      expect(settings.maxItems).toBe(1000);
      // Defaults should still be present
      expect(settings.enabled).toBe(true);
      expect(settings.theme).toBe('dark');
    });
  });

  describe('saveSettings', () => {
    it('should save and retrieve settings', async () => {
      await saveSettings({ defaultMode: 'safe', notifications: false });
      const settings = await getSettings();
      expect(settings.defaultMode).toBe('safe');
      expect(settings.notifications).toBe(false);
      // Other defaults preserved
      expect(settings.enabled).toBe(true);
    });
  });

  describe('getLocal', () => {
    it('should return undefined for non-existent key', async () => {
      const result = await getLocal('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('setLocal / getLocal roundtrip', () => {
    it('should store and retrieve local data', async () => {
      await setLocal('testKey', { foo: 'bar', count: 42 });
      const result = await getLocal<{ foo: string; count: number }>('testKey');
      expect(result).toEqual({ foo: 'bar', count: 42 });
    });

    it('should handle string values', async () => {
      await setLocal('name', 'CopyUnlock');
      const result = await getLocal<string>('name');
      expect(result).toBe('CopyUnlock');
    });

    it('should handle array values', async () => {
      await setLocal('items', [1, 2, 3]);
      const result = await getLocal<number[]>('items');
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
