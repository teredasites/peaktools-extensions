// Chrome API Mocks for unit testing
import { vi } from 'vitest';

type StorageArea = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  onChanged: { addListener: ReturnType<typeof vi.fn> };
};

function createStorageArea(): StorageArea {
  const store: Record<string, any> = {};
  return {
    get: vi.fn((keys?: string | string[] | Record<string, any> | null) => {
      if (keys === null || keys === undefined) return Promise.resolve({ ...store });
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: store[keys] });
      }
      if (Array.isArray(keys)) {
        const result: Record<string, any> = {};
        keys.forEach((k) => {
          if (k in store) result[k] = store[k];
        });
        return Promise.resolve(result);
      }
      // Object with defaults
      const result: Record<string, any> = {};
      Object.keys(keys).forEach((k) => {
        result[k] = k in store ? store[k] : keys[k];
      });
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, any>) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keyArr = Array.isArray(keys) ? keys : [keys];
      keyArr.forEach((k) => delete store[k]);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
      return Promise.resolve();
    }),
    onChanged: {
      addListener: vi.fn(),
    },
  };
}

const messageListeners: Array<(message: any, sender: any, sendResponse: (r: any) => void) => void> = [];

const chromeMock = {
  storage: {
    sync: createStorageArea(),
    local: createStorageArea(),
    session: createStorageArea(),
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn((_message: any) => Promise.resolve(undefined)),
    onMessage: {
      addListener: vi.fn((listener: any) => {
        messageListeners.push(listener);
      }),
      removeListener: vi.fn((listener: any) => {
        const idx = messageListeners.indexOf(listener);
        if (idx >= 0) messageListeners.splice(idx, 1);
      }),
      hasListener: vi.fn((listener: any) => messageListeners.includes(listener)),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    getManifest: vi.fn(() => ({
      version: '1.0.0',
      name: 'CopyUnlock',
    })),
    id: 'mock-extension-id',
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(() => Promise.resolve(undefined)),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve({})),
    get: vi.fn((tabId: number) => Promise.resolve({ id: tabId, url: 'https://example.com' })),
  },
  action: {
    setIcon: vi.fn(() => Promise.resolve()),
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
    setTitle: vi.fn(() => Promise.resolve()),
  },
  contextMenus: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    removeAll: vi.fn(() => Promise.resolve()),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(() => Promise.resolve(true)),
    get: vi.fn(() => Promise.resolve(undefined)),
    getAll: vi.fn(() => Promise.resolve([])),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
    getAll: vi.fn(() => Promise.resolve([])),
  },
  sidePanel: {
    open: vi.fn(() => Promise.resolve()),
    setOptions: vi.fn(() => Promise.resolve()),
    setPanelBehavior: vi.fn(() => Promise.resolve()),
  },
  i18n: {
    getMessage: vi.fn((key: string, _substitutions?: string | string[]) => {
      return key;
    }),
    getUILanguage: vi.fn(() => 'en'),
  },
  windows: {
    getCurrent: vi.fn(() => Promise.resolve({ id: 1 })),
  },
};

// Install globally
(globalThis as any).chrome = chromeMock;

export { chromeMock, messageListeners };
export default chromeMock;
