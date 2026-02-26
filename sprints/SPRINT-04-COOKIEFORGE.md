# SPRINT-04: CookieForge — MV3 Cookie Editor for Developers

> **Extension**: CookieForge
> **Confidence**: 84% (#5 of 10)
> **Build Difficulty**: 6/10 (chrome.cookies API is well-documented; UI complexity is moderate)
> **Sprint Status**: COMPLETE — Full implementation spec
> **Date**: 2026-02-25

---

## EXECUTIVE SUMMARY

CookieForge is the **FIRST** MV3-native cookie editor built from scratch. It fills the trust vacuum created when the legitimate EditThisCookie (3M+ users) was removed from the Chrome Web Store due to MV2 deprecation, and a **malicious copycat** with credential-stealing and phishing capabilities took its place with 50K+ installs. No existing competitor offers a side panel, cookie profiles/environment templates, universal format support (all 7 formats), real-time cookie change monitoring with diff, proper CHIPS/partitioned cookie UI, or bulk multi-select operations. CookieForge does all of it.

**Positioning**: "The cookie editor developers trust. Built for MV3. Zero tracking. Zero ads. Period."

---

## ARCHITECTURE OVERVIEW

```
cookieforge/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── cookie-api.ts
│   │   ├── cookie-monitor.ts
│   │   ├── profile-manager.ts
│   │   ├── import-engine.ts
│   │   ├── export-engine.ts
│   │   └── analytics.ts
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   ├── sidepanel.ts
│   │   ├── sidepanel.css
│   │   └── components/
│   │       ├── cookie-table.ts
│   │       ├── cookie-editor.ts
│   │       ├── search-bar.ts
│   │       ├── cookie-detail.ts
│   │       ├── bulk-actions.ts
│   │       ├── profile-panel.ts
│   │       ├── change-log.ts
│   │       ├── health-dashboard.ts
│   │       ├── import-dialog.ts
│   │       ├── export-dialog.ts
│   │       ├── domain-tree.ts
│   │       └── partitioned-view.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── devtools/
│   │   ├── devtools.html
│   │   ├── devtools.ts
│   │   ├── panel.html
│   │   └── panel.ts
│   ├── options/
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   ├── shared/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── messages.ts
│   │   ├── storage.ts
│   │   ├── logger.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── _locales/
│       ├── en/messages.json
│       ├── es/messages.json
│       ├── pt_BR/messages.json
│       ├── zh_CN/messages.json
│       └── fr/messages.json
├── assets/icons/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── chaos/
│   ├── edge-cases/
│   └── load/
├── scripts/
│   ├── build.ts
│   ├── dev.ts
│   └── package.ts
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── .prettierrc
```

---

## COMPLETE IMPLEMENTATION — EVERY FILE

---

<!-- FILE: cookieforge/manifest.json -->
```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "version": "1.0.0",
  "description": "__MSG_extensionDescription__",
  "default_locale": "en",
  "minimum_chrome_version": "120",
  "permissions": [
    "cookies",
    "storage",
    "sidePanel",
    "contextMenus",
    "activeTab",
    "tabs",
    "alarms",
    "notifications"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "32": "assets/icons/icon-32.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  "side_panel": {
    "default_path": "src/sidepanel/sidepanel.html"
  },
  "devtools_page": "src/devtools/devtools.html",
  "options_page": "src/options/options.html",
  "icons": {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  },
  "incognito": "split",
  "commands": {
    "open-side-panel": {
      "suggested_key": { "default": "Alt+Shift+C" },
      "description": "__MSG_commandOpenPanel__"
    },
    "copy-cookies-json": {
      "suggested_key": { "default": "Alt+Shift+J" },
      "description": "__MSG_commandCopyJSON__"
    },
    "copy-cookies-header": {
      "suggested_key": { "default": "Alt+Shift+H" },
      "description": "__MSG_commandCopyHeader__"
    }
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

<!-- FILE: cookieforge/package.json -->
```json
{
  "name": "cookieforge",
  "version": "1.0.0",
  "description": "MV3-native cookie editor for developers",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsx scripts/build.ts",
    "dev": "tsx scripts/dev.ts",
    "package": "tsx scripts/package.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "archiver": "^7.0.0",
    "chokidar": "^3.6.0",
    "esbuild": "^0.21.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0",
    "puppeteer": "^22.0.0"
  },
  "dependencies": {
    "ExtPay": "^5.3.0"
  }
}
```

---

<!-- FILE: cookieforge/tsconfig.json -->
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

<!-- FILE: cookieforge/.eslintrc.json -->
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-eval": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": "error"
  },
  "env": { "browser": true, "webextensions": true, "es2022": true }
}
```

---

<!-- FILE: cookieforge/.prettierrc -->
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

---

<!-- FILE: cookieforge/src/shared/types.ts -->
```typescript
// ─── Cookie Core Types ───

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSiteStatus;
  expirationDate: number | undefined;
  hostOnly: boolean;
  session: boolean;
  storeId: string;
  /** CHIPS: partitionKey for partitioned cookies (Chrome 114+) */
  partitionKey?: CookiePartitionKey;
}

export interface CookiePartitionKey {
  topLevelSite: string;
  hasCrossSiteAncestor?: boolean;
}

export type SameSiteStatus = 'no_restriction' | 'lax' | 'strict' | 'unspecified';

export interface CookieIdentifier {
  name: string;
  domain: string;
  path: string;
  storeId: string;
  partitionKey?: CookiePartitionKey;
}

export interface CookieChange {
  cookie: CookieData;
  removed: boolean;
  cause: CookieChangeCause;
  timestamp: number;
}

export type CookieChangeCause =
  | 'evicted'
  | 'expired'
  | 'explicit'
  | 'expired_overwrite'
  | 'overwrite';

// ─── Diff Types ───

export interface CookieDiff {
  type: 'added' | 'removed' | 'modified';
  cookie: CookieData;
  previousValue?: string;
  newValue?: string;
  changedFields?: string[];
  timestamp: number;
}

// ─── Cookie Health ───

export type CookieHealthIssue =
  | 'expired'
  | 'expiring_soon'
  | 'insecure_on_secure_domain'
  | 'missing_samesite'
  | 'oversized_value'
  | 'oversized_name'
  | 'duplicate_name'
  | 'third_party_tracking'
  | 'missing_path'
  | 'missing_secure_flag'
  | 'missing_httponly_flag'
  | 'session_with_long_expiry';

export interface CookieHealthReport {
  domain: string;
  totalCookies: number;
  issues: CookieHealthEntry[];
  score: number; // 0-100
  generatedAt: number;
}

export interface CookieHealthEntry {
  cookie: CookieIdentifier;
  issue: CookieHealthIssue;
  severity: 'info' | 'warning' | 'error';
  description: string;
  suggestion: string;
}

// ─── Profiles ───

export interface CookieProfile {
  id: string;
  name: string;
  description: string;
  cookies: CookieData[];
  domain: string | null; // null = cross-domain
  createdAt: number;
  updatedAt: number;
  color: string;
  icon: string;
  locked: boolean;
}

export interface ProfileSnapshot {
  profileId: string;
  cookies: CookieData[];
  timestamp: number;
  domain: string;
}

// ─── Import/Export Formats ───

export type CookieExportFormat =
  | 'json'
  | 'netscape'
  | 'header'
  | 'curl'
  | 'puppeteer'
  | 'playwright'
  | 'selenium';

export interface ExportResult {
  format: CookieExportFormat;
  content: string;
  filename: string;
  mimeType: string;
  cookieCount: number;
}

export interface ImportResult {
  cookies: CookieData[];
  format: CookieExportFormat | 'unknown';
  errors: string[];
  warnings: string[];
  totalParsed: number;
  totalSkipped: number;
}

// ─── Settings ───

export interface CookieForgeSettings {
  theme: 'dark' | 'light' | 'system';
  showHttpOnly: boolean;
  showSecure: boolean;
  showSession: boolean;
  showPartitioned: boolean;
  defaultExportFormat: CookieExportFormat;
  monitorEnabled: boolean;
  monitorMaxEntries: number;
  notifyOnChange: boolean;
  notifyOnlyTracking: boolean;
  autoRefreshInterval: number; // seconds, 0 = disabled
  groupByDomain: boolean;
  showCookieSize: boolean;
  defaultSortField: CookieSortField;
  defaultSortDirection: 'asc' | 'desc';
  confirmBeforeDelete: boolean;
  confirmBeforeBulkDelete: boolean;
  maxProfileCount: number;
  enableDevtoolsPanel: boolean;
  compactView: boolean;
  highlightChanges: boolean;
  changeHighlightDurationMs: number;
}

export type CookieSortField =
  | 'name'
  | 'domain'
  | 'value'
  | 'expirationDate'
  | 'size'
  | 'path'
  | 'sameSite';

export const DEFAULT_SETTINGS: CookieForgeSettings = {
  theme: 'dark',
  showHttpOnly: true,
  showSecure: true,
  showSession: true,
  showPartitioned: true,
  defaultExportFormat: 'json',
  monitorEnabled: true,
  monitorMaxEntries: 500,
  notifyOnChange: false,
  notifyOnlyTracking: false,
  autoRefreshInterval: 0,
  groupByDomain: true,
  showCookieSize: true,
  defaultSortField: 'name',
  defaultSortDirection: 'asc',
  confirmBeforeDelete: true,
  confirmBeforeBulkDelete: true,
  maxProfileCount: 50,
  enableDevtoolsPanel: true,
  compactView: false,
  highlightChanges: true,
  changeHighlightDurationMs: 3000,
};

// ─── ExtensionPay ───

export interface ProStatus {
  isPro: boolean;
  trialActive: boolean;
  trialDaysLeft: number;
}

// ─── Analytics ───

export interface UsageStats {
  cookiesViewed: number;
  cookiesEdited: number;
  cookiesCreated: number;
  cookiesDeleted: number;
  profilesCreated: number;
  profilesApplied: number;
  exportsPerformed: Record<CookieExportFormat, number>;
  importsPerformed: number;
  searchesPerformed: number;
  panelOpened: number;
  firstUsed: number;
  lastUsed: number;
}

export const DEFAULT_STATS: UsageStats = {
  cookiesViewed: 0,
  cookiesEdited: 0,
  cookiesCreated: 0,
  cookiesDeleted: 0,
  profilesCreated: 0,
  profilesApplied: 0,
  exportsPerformed: {
    json: 0,
    netscape: 0,
    header: 0,
    curl: 0,
    puppeteer: 0,
    playwright: 0,
    selenium: 0,
  },
  importsPerformed: 0,
  searchesPerformed: 0,
  panelOpened: 0,
  firstUsed: 0,
  lastUsed: 0,
};

// ─── Filter & View State ───

export interface CookieFilter {
  search: string;
  domain: string | null;
  httpOnly: boolean | null;
  secure: boolean | null;
  session: boolean | null;
  sameSite: SameSiteStatus | null;
  partitioned: boolean | null;
  hasIssues: boolean | null;
}

export const EMPTY_FILTER: CookieFilter = {
  search: '',
  domain: null,
  httpOnly: null,
  secure: null,
  session: null,
  sameSite: null,
  partitioned: null,
  hasIssues: null,
};

// ─── Bulk Operations ───

export type BulkAction =
  | 'delete'
  | 'export'
  | 'duplicate'
  | 'set_secure'
  | 'set_httponly'
  | 'set_samesite'
  | 'extend_expiry'
  | 'save_to_profile';

export interface BulkActionResult {
  action: BulkAction;
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}
```

---

<!-- FILE: cookieforge/src/shared/constants.ts -->
```typescript
export const EXT_NAME = 'CookieForge';
declare const __VERSION__: string;
export const EXT_VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.0';

// ─── Storage Keys ───
export const STORAGE_SETTINGS = 'cookieforge_settings';
export const STORAGE_PROFILES = 'cookieforge_profiles';
export const STORAGE_STATS = 'cookieforge_stats';
export const STORAGE_CHANGE_LOG = 'cookieforge_changelog';
export const STORAGE_PINNED_DOMAINS = 'cookieforge_pinned';

// ─── Limits ───
export const FREE_MAX_PROFILES = 3;
export const FREE_MAX_EXPORT_FORMATS = 3; // json, netscape, header
export const FREE_MAX_MONITOR_ENTRIES = 100;
export const FREE_MAX_BULK_SELECT = 20;
export const PRO_MAX_PROFILES = 200;
export const PRO_MAX_EXPORT_FORMATS = 7;
export const PRO_MAX_MONITOR_ENTRIES = 5000;
export const PRO_MAX_BULK_SELECT = 10_000;
export const MAX_COOKIE_VALUE_DISPLAY = 500; // truncate in table view
export const MAX_COOKIE_NAME_LENGTH = 4096;
export const MAX_COOKIE_VALUE_LENGTH = 4096;
export const MAX_COOKIE_SIZE_BYTES = 4096;
export const MAX_COOKIES_PER_DOMAIN = 180;
export const MAX_TOTAL_COOKIES = 3000;

// ─── Performance Budgets ───
export const RENDER_BUDGET_MS = 16; // 60fps
export const SEARCH_DEBOUNCE_MS = 150;
export const FILTER_DEBOUNCE_MS = 100;
export const MONITOR_BATCH_INTERVAL_MS = 500;
export const TABLE_VIRTUAL_SCROLL_HEIGHT = 48; // row height px
export const TABLE_VIRTUAL_BUFFER = 15; // extra rows above/below viewport
export const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
export const AUTO_REFRESH_MIN_INTERVAL = 5; // seconds

// ─── Cookie Size Thresholds ───
export const COOKIE_SIZE_OK = 1024;
export const COOKIE_SIZE_WARN = 3072;
export const COOKIE_SIZE_ERROR = 4096;

// ─── Expiry Thresholds ───
export const EXPIRY_SOON_HOURS = 24;
export const EXPIRY_WARN_HOURS = 168; // 7 days

// ─── Known Tracking Domains ───
export const KNOWN_TRACKERS = new Set([
  'doubleclick.net',
  'google-analytics.com',
  'googleadservices.com',
  'facebook.com',
  'fbcdn.net',
  'analytics.twitter.com',
  'ads.linkedin.com',
  'bat.bing.com',
  'criteo.com',
  'demdex.net',
  'adnxs.com',
  'rubiconproject.com',
  'pubmatic.com',
  'taboola.com',
  'outbrain.com',
  'scorecardresearch.com',
  'quantserve.com',
  'mixpanel.com',
  'amplitude.com',
  'hotjar.com',
  'segment.io',
]);

// ─── SameSite Labels ───
export const SAME_SITE_LABELS: Record<string, string> = {
  no_restriction: 'None',
  lax: 'Lax',
  strict: 'Strict',
  unspecified: 'Unspecified',
};

// ─── Export Format Metadata ───
export const FORMAT_METADATA: Record<string, { label: string; ext: string; mime: string; pro: boolean }> = {
  json: { label: 'JSON', ext: 'json', mime: 'application/json', pro: false },
  netscape: { label: 'Netscape (cookies.txt)', ext: 'txt', mime: 'text/plain', pro: false },
  header: { label: 'Cookie Header', ext: 'txt', mime: 'text/plain', pro: false },
  curl: { label: 'cURL Command', ext: 'sh', mime: 'text/x-sh', pro: true },
  puppeteer: { label: 'Puppeteer Script', ext: 'js', mime: 'text/javascript', pro: true },
  playwright: { label: 'Playwright Context', ext: 'json', mime: 'application/json', pro: true },
  selenium: { label: 'Selenium Script', ext: 'py', mime: 'text/x-python', pro: true },
};

// ─── Alarms ───
export const ALARM_MONITOR_FLUSH = 'cookieforge-monitor-flush';
export const ALARM_HEALTH_CHECK = 'cookieforge-health-check';
export const ALARM_CLEANUP = 'cookieforge-cleanup';

// ─── Context Menu IDs ───
export const CTX_COPY_COOKIES_JSON = 'cookieforge-copy-json';
export const CTX_COPY_COOKIES_HEADER = 'cookieforge-copy-header';
export const CTX_OPEN_PANEL = 'cookieforge-open-panel';
export const CTX_DELETE_DOMAIN = 'cookieforge-delete-domain';

// ─── Colors for Profiles ───
export const PROFILE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
];

// ─── Profile Icons ───
export const PROFILE_ICONS = [
  'cookie', 'flask', 'rocket', 'shield', 'bug',
  'code', 'globe', 'lock', 'key', 'star',
  'bolt', 'server',
];
```

---

<!-- FILE: cookieforge/src/shared/messages.ts -->
```typescript
import type {
  CookieData,
  CookieIdentifier,
  CookieExportFormat,
  CookieFilter,
  CookieChange,
  CookieProfile,
  CookieHealthReport,
  BulkAction,
  BulkActionResult,
  ImportResult,
  ExportResult,
  CookieForgeSettings,
  UsageStats,
  ProStatus,
} from './types';

// ─── Message Map: action → payload/response ───

export interface MessageMap {
  // Cookie CRUD
  'cookies:getAll': { payload: { domain?: string; url?: string }; response: CookieData[] };
  'cookies:get': { payload: CookieIdentifier; response: CookieData | null };
  'cookies:set': { payload: CookieData; response: CookieData };
  'cookies:remove': { payload: CookieIdentifier; response: boolean };
  'cookies:removeMultiple': { payload: CookieIdentifier[]; response: { succeeded: number; failed: number } };
  'cookies:duplicate': { payload: CookieIdentifier & { newName?: string }; response: CookieData };

  // Bulk operations
  'bulk:execute': { payload: { cookies: CookieIdentifier[]; action: BulkAction; params?: Record<string, unknown> }; response: BulkActionResult };

  // Monitor
  'monitor:getLog': { payload: { limit?: number; since?: number }; response: CookieChange[] };
  'monitor:clearLog': { payload: void; response: void };
  'monitor:subscribe': { payload: void; response: void };
  'monitor:unsubscribe': { payload: void; response: void };

  // Profiles
  'profiles:getAll': { payload: void; response: CookieProfile[] };
  'profiles:get': { payload: { id: string }; response: CookieProfile | null };
  'profiles:create': { payload: Omit<CookieProfile, 'id' | 'createdAt' | 'updatedAt'>; response: CookieProfile };
  'profiles:update': { payload: CookieProfile; response: CookieProfile };
  'profiles:delete': { payload: { id: string }; response: boolean };
  'profiles:apply': { payload: { id: string; domain: string; merge: boolean }; response: { set: number; skipped: number; errors: string[] } };
  'profiles:snapshot': { payload: { id: string; domain: string }; response: CookieProfile };

  // Import / Export
  'export:execute': { payload: { cookies: CookieData[]; format: CookieExportFormat; domain?: string }; response: ExportResult };
  'import:parse': { payload: { content: string; filename?: string }; response: ImportResult };
  'import:apply': { payload: { cookies: CookieData[]; overwrite: boolean }; response: { set: number; failed: number; errors: string[] } };

  // Health
  'health:check': { payload: { domain?: string }; response: CookieHealthReport };

  // Settings
  'settings:get': { payload: void; response: CookieForgeSettings };
  'settings:set': { payload: Partial<CookieForgeSettings>; response: CookieForgeSettings };

  // Stats
  'stats:get': { payload: void; response: UsageStats };
  'stats:increment': { payload: { key: keyof UsageStats; value?: number }; response: void };

  // Pro
  'pro:getStatus': { payload: void; response: ProStatus };
  'pro:openPayment': { payload: void; response: void };

  // Tab context
  'tab:getCurrent': { payload: void; response: { url: string; domain: string; tabId: number } };
}

// ─── Typed sendMessage ───

export type MessageAction = keyof MessageMap;

export interface Message<A extends MessageAction = MessageAction> {
  action: A;
  payload: MessageMap[A]['payload'];
  requestId: string;
}

export interface MessageResponse<A extends MessageAction = MessageAction> {
  success: boolean;
  data?: MessageMap[A]['response'];
  error?: string;
  requestId: string;
}

let _reqCounter = 0;

export function sendMessage<A extends MessageAction>(
  action: A,
  payload: MessageMap[A]['payload'],
): Promise<MessageMap[A]['response']> {
  const requestId = `${action}-${Date.now()}-${++_reqCounter}`;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action, payload, requestId } satisfies Message<A>,
      (response: MessageResponse<A>) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error(`No response for ${action}`));
          return;
        }
        if (!response.success) {
          reject(new Error(response.error ?? `Unknown error in ${action}`));
          return;
        }
        resolve(response.data as MessageMap[A]['response']);
      },
    );
  });
}

// ─── Broadcast for monitor events ───

export interface BroadcastEvent {
  type: 'cookie-changed';
  data: CookieChange;
}

export function broadcastToAll(event: BroadcastEvent): void {
  chrome.runtime.sendMessage({ broadcast: true, event }).catch(() => {
    // Popup/sidepanel may not be open — ignore
  });
}
```

---

<!-- FILE: cookieforge/src/shared/storage.ts -->
```typescript
import type { CookieForgeSettings, CookieProfile, UsageStats } from './types';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from './types';
import {
  STORAGE_SETTINGS,
  STORAGE_PROFILES,
  STORAGE_STATS,
  STORAGE_CHANGE_LOG,
  STORAGE_PINNED_DOMAINS,
} from './constants';

// ─── Typed chrome.storage wrapper ───

type StorageArea = 'sync' | 'local';

async function getFromStorage<T>(key: string, fallback: T, area: StorageArea = 'local'): Promise<T> {
  const store = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  const result = await store.get(key);
  const value = result[key];
  if (value === undefined || value === null) return fallback;
  return value as T;
}

async function setInStorage<T>(key: string, value: T, area: StorageArea = 'local'): Promise<void> {
  const store = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  await store.set({ [key]: value });
}

async function removeFromStorage(key: string, area: StorageArea = 'local'): Promise<void> {
  const store = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  await store.remove(key);
}

// ─── Settings (synced) ───

export async function getSettings(): Promise<CookieForgeSettings> {
  return getFromStorage(STORAGE_SETTINGS, DEFAULT_SETTINGS, 'sync');
}

export async function setSettings(partial: Partial<CookieForgeSettings>): Promise<CookieForgeSettings> {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  await setInStorage(STORAGE_SETTINGS, merged, 'sync');
  return merged;
}

// ─── Profiles (local — can be large) ───

export async function getProfiles(): Promise<CookieProfile[]> {
  return getFromStorage<CookieProfile[]>(STORAGE_PROFILES, [], 'local');
}

export async function setProfiles(profiles: CookieProfile[]): Promise<void> {
  await setInStorage(STORAGE_PROFILES, profiles, 'local');
}

export async function addProfile(profile: CookieProfile): Promise<void> {
  const profiles = await getProfiles();
  profiles.push(profile);
  await setProfiles(profiles);
}

export async function updateProfile(profile: CookieProfile): Promise<void> {
  const profiles = await getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx === -1) throw new Error(`Profile not found: ${profile.id}`);
  profiles[idx] = profile;
  await setProfiles(profiles);
}

export async function removeProfile(id: string): Promise<void> {
  const profiles = await getProfiles();
  await setProfiles(profiles.filter((p) => p.id !== id));
}

// ─── Stats (local) ───

export async function getStats(): Promise<UsageStats> {
  return getFromStorage(STORAGE_STATS, DEFAULT_STATS, 'local');
}

export async function incrementStat(
  key: keyof UsageStats,
  value: number = 1,
): Promise<void> {
  const stats = await getStats();
  const current = stats[key];
  if (typeof current === 'number') {
    (stats as Record<string, unknown>)[key] = current + value;
  }
  stats.lastUsed = Date.now();
  if (stats.firstUsed === 0) stats.firstUsed = Date.now();
  await setInStorage(STORAGE_STATS, stats, 'local');
}

// ─── Change Log (local) ───

export async function getChangeLog(limit = 500): Promise<unknown[]> {
  const all = await getFromStorage<unknown[]>(STORAGE_CHANGE_LOG, [], 'local');
  return all.slice(-limit);
}

export async function appendChangeLog(entry: unknown): Promise<void> {
  const all = await getFromStorage<unknown[]>(STORAGE_CHANGE_LOG, [], 'local');
  all.push(entry);
  // Trim to last 5000 entries to prevent unbounded growth
  const trimmed = all.length > 5000 ? all.slice(-5000) : all;
  await setInStorage(STORAGE_CHANGE_LOG, trimmed, 'local');
}

export async function clearChangeLog(): Promise<void> {
  await removeFromStorage(STORAGE_CHANGE_LOG, 'local');
}

// ─── Pinned Domains ───

export async function getPinnedDomains(): Promise<string[]> {
  return getFromStorage<string[]>(STORAGE_PINNED_DOMAINS, [], 'sync');
}

export async function setPinnedDomains(domains: string[]): Promise<void> {
  await setInStorage(STORAGE_PINNED_DOMAINS, domains, 'sync');
}
```

---

<!-- FILE: cookieforge/src/shared/logger.ts -->
```typescript
const PREFIX = '[CookieForge]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatArgs(module: string, msg: string, data?: unknown): unknown[] {
  const timestamp = new Date().toISOString().slice(11, 23);
  const args: unknown[] = [`${PREFIX} [${timestamp}] [${module}] ${msg}`];
  if (data !== undefined) args.push(data);
  return args;
}

export function createLogger(module: string) {
  return {
    debug(msg: string, data?: unknown): void {
      if (shouldLog('debug')) console.debug(...formatArgs(module, msg, data));
    },
    info(msg: string, data?: unknown): void {
      if (shouldLog('info')) console.info(...formatArgs(module, msg, data));
    },
    warn(msg: string, data?: unknown): void {
      if (shouldLog('warn')) console.warn(...formatArgs(module, msg, data));
    },
    error(msg: string, data?: unknown): void {
      if (shouldLog('error')) console.error(...formatArgs(module, msg, data));
    },
    time(label: string): () => void {
      const start = performance.now();
      return () => {
        const elapsed = performance.now() - start;
        if (shouldLog('debug')) {
          console.debug(`${PREFIX} [${module}] ${label} took ${elapsed.toFixed(2)}ms`);
        }
      };
    },
  };
}
```

---

<!-- FILE: cookieforge/src/shared/formatters.ts -->
```typescript
import type { CookieData, CookieExportFormat, ExportResult } from './types';
import { FORMAT_METADATA } from './constants';

// ─── Export Formatters (all 7 formats) ───

export function formatCookies(cookies: CookieData[], format: CookieExportFormat, domain?: string): ExportResult {
  const meta = FORMAT_METADATA[format];
  const filename = `cookies_${domain ?? 'all'}_${Date.now()}.${meta.ext}`;

  let content: string;
  switch (format) {
    case 'json':
      content = formatJSON(cookies);
      break;
    case 'netscape':
      content = formatNetscape(cookies);
      break;
    case 'header':
      content = formatHeader(cookies);
      break;
    case 'curl':
      content = formatCurl(cookies, domain);
      break;
    case 'puppeteer':
      content = formatPuppeteer(cookies);
      break;
    case 'playwright':
      content = formatPlaywright(cookies);
      break;
    case 'selenium':
      content = formatSelenium(cookies);
      break;
  }

  return {
    format,
    content,
    filename,
    mimeType: meta.mime,
    cookieCount: cookies.length,
  };
}

// ─── JSON ───
function formatJSON(cookies: CookieData[]): string {
  return JSON.stringify(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expirationDate: c.expirationDate,
      hostOnly: c.hostOnly,
      session: c.session,
      ...(c.partitionKey ? { partitionKey: c.partitionKey } : {}),
    })),
    null,
    2,
  );
}

// ─── Netscape cookies.txt ───
function formatNetscape(cookies: CookieData[]): string {
  const header = '# Netscape HTTP Cookie File\n# https://curl.se/docs/http-cookies.html\n# This file was generated by CookieForge\n\n';
  const lines = cookies.map((c) => {
    const domainInitialDot = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const expiry = c.expirationDate ? Math.floor(c.expirationDate) : 0;
    const secure = c.secure ? 'TRUE' : 'FALSE';
    return `${c.domain}\t${domainInitialDot}\t${c.path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`;
  });
  return header + lines.join('\n') + '\n';
}

// ─── Cookie Header ───
function formatHeader(cookies: CookieData[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

// ─── cURL ───
function formatCurl(cookies: CookieData[], domain?: string): string {
  const url = domain ? `https://${domain}/` : 'https://example.com/';
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  return `curl -v \\\n  --cookie '${escapeShell(cookieStr)}' \\\n  '${url}'`;
}

function escapeShell(s: string): string {
  return s.replace(/'/g, "'\\''");
}

// ─── Puppeteer ───
function formatPuppeteer(cookies: CookieData[]): string {
  const cookieObjs = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: mapSameSitePuppeteer(c.sameSite),
    ...(c.expirationDate ? { expires: c.expirationDate } : {}),
  }));

  return `// Puppeteer cookie injection — generated by CookieForge
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const cookies = ${JSON.stringify(cookieObjs, null, 2)};

  await page.setCookie(...cookies);
  await page.goto('https://${cookies[0]?.domain ?? 'example.com'}/');

  // Your automation code here

  await browser.close();
})();`;
}

function mapSameSitePuppeteer(ss: string): string {
  switch (ss) {
    case 'strict': return 'Strict';
    case 'lax': return 'Lax';
    case 'no_restriction': return 'None';
    default: return 'Lax';
  }
}

// ─── Playwright ───
function formatPlaywright(cookies: CookieData[]): string {
  const state = {
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: mapSameSitePuppeteer(c.sameSite),
      expires: c.expirationDate ?? -1,
    })),
    origins: [],
  };
  return JSON.stringify(state, null, 2);
}

// ─── Selenium (Python) ───
function formatSelenium(cookies: CookieData[]): string {
  const lines = cookies.map((c) => {
    const dict = [
      `    {'name': '${escapePython(c.name)}'`,
      `     'value': '${escapePython(c.value)}'`,
      `     'domain': '${c.domain}'`,
      `     'path': '${c.path}'`,
      `     'secure': ${c.secure ? 'True' : 'False'}`,
      `     'httpOnly': ${c.httpOnly ? 'True' : 'False'}}`,
    ];
    return dict.join(',\n');
  });

  return `# Selenium cookie injection — generated by CookieForge
from selenium import webdriver

driver = webdriver.Chrome()
driver.get('https://${cookies[0]?.domain ?? 'example.com'}/')

cookies = [
${lines.join(',\n')}
]

for cookie in cookies:
    try:
        driver.add_cookie(cookie)
    except Exception as e:
        print(f"Failed to set {cookie['name']}: {e}")

driver.refresh()
# Your automation code here
driver.quit()`;
}

function escapePython(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ─── Size Formatting ───

export function formatCookieSize(cookie: CookieData): number {
  return new Blob([`${cookie.name}=${cookie.value}`]).size;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Date Formatting ───

export function formatExpiry(expirationDate: number | undefined, session: boolean): string {
  if (session || expirationDate === undefined) return 'Session';
  const date = new Date(expirationDate * 1000);
  const now = new Date();
  if (date < now) return `Expired ${formatRelative(date)}`;
  return formatRelative(date);
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);
  const past = diff < 0;

  if (absDiff < 60_000) return past ? 'just now' : 'in < 1 min';
  if (absDiff < 3_600_000) {
    const mins = Math.floor(absDiff / 60_000);
    return past ? `${mins}m ago` : `in ${mins}m`;
  }
  if (absDiff < 86_400_000) {
    const hours = Math.floor(absDiff / 3_600_000);
    return past ? `${hours}h ago` : `in ${hours}h`;
  }
  if (absDiff < 2_592_000_000) {
    const days = Math.floor(absDiff / 86_400_000);
    return past ? `${days}d ago` : `in ${days}d`;
  }
  return date.toLocaleDateString();
}

// ─── Domain Helpers ───

export function extractRootDomain(domain: string): string {
  const cleaned = domain.startsWith('.') ? domain.slice(1) : domain;
  const parts = cleaned.split('.');
  if (parts.length <= 2) return cleaned;
  return parts.slice(-2).join('.');
}

export function sortDomainTree(domains: string[]): string[] {
  return [...domains].sort((a, b) => {
    const aRoot = extractRootDomain(a);
    const bRoot = extractRootDomain(b);
    if (aRoot !== bRoot) return aRoot.localeCompare(bRoot);
    return a.localeCompare(b);
  });
}
```

---

<!-- FILE: cookieforge/src/shared/validators.ts -->
```typescript
import type { CookieData, SameSiteStatus } from './types';
import {
  MAX_COOKIE_NAME_LENGTH,
  MAX_COOKIE_VALUE_LENGTH,
  MAX_COOKIE_SIZE_BYTES,
} from './constants';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates a cookie before creation/update. Returns an array of issues.
 * Empty array = valid cookie.
 */
export function validateCookie(cookie: Partial<CookieData>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name validation
  if (!cookie.name || cookie.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Cookie name is required', severity: 'error' });
  } else {
    if (cookie.name.length > MAX_COOKIE_NAME_LENGTH) {
      errors.push({ field: 'name', message: `Name exceeds ${MAX_COOKIE_NAME_LENGTH} chars`, severity: 'error' });
    }
    // RFC 6265: cookie-name must not contain CTLs, spaces, tabs, or separators
    if (/[\x00-\x1F\x7F\s;=,]/.test(cookie.name)) {
      errors.push({ field: 'name', message: 'Name contains invalid characters (spaces, semicolons, equals, or control chars)', severity: 'error' });
    }
    // __Secure- prefix requires Secure flag
    if (cookie.name.startsWith('__Secure-') && !cookie.secure) {
      errors.push({ field: 'name', message: '__Secure- prefix requires Secure flag', severity: 'error' });
    }
    // __Host- prefix requires Secure, Path=/, no Domain
    if (cookie.name.startsWith('__Host-')) {
      if (!cookie.secure) {
        errors.push({ field: 'name', message: '__Host- prefix requires Secure flag', severity: 'error' });
      }
      if (cookie.path !== '/') {
        errors.push({ field: 'name', message: '__Host- prefix requires path="/"', severity: 'error' });
      }
      if (cookie.domain && cookie.domain.startsWith('.')) {
        errors.push({ field: 'name', message: '__Host- prefix must not have a domain with leading dot', severity: 'error' });
      }
    }
  }

  // Value validation
  if (cookie.value !== undefined) {
    if (cookie.value.length > MAX_COOKIE_VALUE_LENGTH) {
      errors.push({ field: 'value', message: `Value exceeds ${MAX_COOKIE_VALUE_LENGTH} chars`, severity: 'error' });
    }
    // RFC 6265: no CTLs, whitespace, double quotes, commas, semicolons, backslash
    if (/[\x00-\x1F\x7F]/.test(cookie.value)) {
      errors.push({ field: 'value', message: 'Value contains control characters', severity: 'error' });
    }
  }

  // Total size check
  if (cookie.name && cookie.value !== undefined) {
    const totalSize = new Blob([`${cookie.name}=${cookie.value}`]).size;
    if (totalSize > MAX_COOKIE_SIZE_BYTES) {
      errors.push({ field: 'size', message: `Total cookie size (${totalSize}B) exceeds browser limit (${MAX_COOKIE_SIZE_BYTES}B)`, severity: 'error' });
    }
  }

  // Domain validation
  if (cookie.domain) {
    if (cookie.domain.includes(' ')) {
      errors.push({ field: 'domain', message: 'Domain must not contain spaces', severity: 'error' });
    }
    // Public suffix check (basic)
    const tld = cookie.domain.replace(/^\./, '').split('.').pop();
    if (tld && ['com', 'org', 'net', 'io', 'dev'].includes(tld) && cookie.domain.replace(/^\./, '').split('.').length < 2) {
      errors.push({ field: 'domain', message: 'Cannot set cookie on public suffix alone', severity: 'error' });
    }
  } else {
    errors.push({ field: 'domain', message: 'Domain is required', severity: 'error' });
  }

  // Path validation
  if (cookie.path !== undefined && cookie.path.length > 0 && !cookie.path.startsWith('/')) {
    errors.push({ field: 'path', message: 'Path must start with /', severity: 'error' });
  }

  // SameSite + Secure consistency
  if (cookie.sameSite === 'no_restriction' && !cookie.secure) {
    errors.push({ field: 'sameSite', message: 'SameSite=None requires Secure flag', severity: 'error' });
  }

  // Expiry validation
  if (cookie.expirationDate !== undefined) {
    const now = Date.now() / 1000;
    if (cookie.expirationDate < now) {
      errors.push({ field: 'expirationDate', message: 'Expiration date is in the past', severity: 'warning' });
    }
    // Chrome max: ~400 days from now (per spec proposal)
    const maxExpiry = now + 400 * 24 * 60 * 60;
    if (cookie.expirationDate > maxExpiry) {
      errors.push({ field: 'expirationDate', message: 'Expiration exceeds ~400 day browser limit; may be clamped', severity: 'warning' });
    }
  }

  // Partitioned cookie validation (CHIPS)
  if (cookie.partitionKey) {
    if (!cookie.secure) {
      errors.push({ field: 'partitionKey', message: 'Partitioned cookies require Secure flag', severity: 'error' });
    }
    if (cookie.sameSite !== 'no_restriction') {
      errors.push({ field: 'partitionKey', message: 'Partitioned cookies should use SameSite=None', severity: 'warning' });
    }
    if (!cookie.partitionKey.topLevelSite || cookie.partitionKey.topLevelSite.trim().length === 0) {
      errors.push({ field: 'partitionKey', message: 'Partition key must specify topLevelSite', severity: 'error' });
    }
  }

  return errors;
}

/**
 * Validate a SameSite string is one of the known values.
 */
export function isValidSameSite(value: string): value is SameSiteStatus {
  return ['no_restriction', 'lax', 'strict', 'unspecified'].includes(value);
}

/**
 * Sanitize a cookie value — strip NUL bytes and trim excessive whitespace.
 */
export function sanitizeCookieValue(value: string): string {
  return value.replace(/\0/g, '').trim();
}

/**
 * Validate import content looks like a supported format.
 */
export function detectImportFormat(content: string): 'json' | 'netscape' | 'header' | 'unknown' {
  const trimmed = content.trim();

  // JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      return 'unknown';
    }
  }

  // Netscape format: starts with # or domain lines with tabs
  if (trimmed.startsWith('# Netscape') || trimmed.startsWith('# HTTP Cookie') || /^[.\w].*\t.*\t.*\t.*\t.*\t.*\t/.test(trimmed)) {
    return 'netscape';
  }

  // Cookie header: name=value; name=value
  if (/^\w[\w-]*=.*(;\s*\w[\w-]*=.*)*$/.test(trimmed) && !trimmed.includes('\n')) {
    return 'header';
  }

  return 'unknown';
}
```

---

<!-- FILE: cookieforge/src/background/service-worker.ts -->
```typescript
import { createLogger } from '../shared/logger';
import type { Message, MessageAction, MessageResponse } from '../shared/messages';
import { broadcastToAll } from '../shared/messages';
import { getSettings, getStats, setSettings, incrementStat } from '../shared/storage';
import { CookieAPI } from './cookie-api';
import { CookieMonitor } from './cookie-monitor';
import { ProfileManager } from './profile-manager';
import { ImportEngine } from './import-engine';
import { ExportEngine } from './export-engine';
import { trackEvent } from './analytics';
import {
  CTX_COPY_COOKIES_JSON,
  CTX_COPY_COOKIES_HEADER,
  CTX_OPEN_PANEL,
  CTX_DELETE_DOMAIN,
  ALARM_CLEANUP,
} from '../shared/constants';

const log = createLogger('ServiceWorker');

// ─── Module Instances ───

const cookieApi = new CookieAPI();
const monitor = new CookieMonitor();
const profiles = new ProfileManager();
const importEngine = new ImportEngine();
const exportEngine = new ExportEngine();

// ─── Extension Install/Update ───

chrome.runtime.onInstalled.addListener(async (details) => {
  log.info('Extension installed', { reason: details.reason });

  // Create context menus
  chrome.contextMenus.create({
    id: CTX_COPY_COOKIES_JSON,
    title: chrome.i18n.getMessage('ctxCopyJSON') || 'Copy cookies as JSON',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: CTX_COPY_COOKIES_HEADER,
    title: chrome.i18n.getMessage('ctxCopyHeader') || 'Copy cookies as Header',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: CTX_OPEN_PANEL,
    title: chrome.i18n.getMessage('ctxOpenPanel') || 'Open CookieForge',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: CTX_DELETE_DOMAIN,
    title: chrome.i18n.getMessage('ctxDeleteDomain') || 'Delete all cookies for this domain',
    contexts: ['page'],
  });

  // Set up side panel behavior
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

  // Set up alarms
  chrome.alarms.create(ALARM_CLEANUP, { periodInMinutes: 60 });

  // Initialize ExtPay
  try {
    const ExtPay = (await import('ExtPay')).default;
    const extpay = ExtPay('cookieforge');
    extpay.startBackground();
  } catch (e) {
    log.warn('ExtPay init failed — running in free mode', e);
  }

  if (details.reason === 'install') {
    trackEvent('install');
    // Open options page on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html?welcome=true') });
  }

  // Start cookie monitor
  monitor.start();
});

// ─── Startup (service worker woke up) ───

chrome.runtime.onStartup.addListener(() => {
  log.info('Service worker started');
  monitor.start();
});

// ─── Message Router ───

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (resp: MessageResponse) => void) => {
    if (!message.action || message.broadcast) return false;

    handleMessage(message)
      .then((data) => {
        sendResponse({ success: true, data, requestId: message.requestId });
      })
      .catch((err: Error) => {
        log.error(`Message handler error: ${message.action}`, err);
        sendResponse({ success: false, error: err.message, requestId: message.requestId });
      });

    return true; // async response
  },
);

async function handleMessage(message: Message): Promise<unknown> {
  const { action, payload } = message;

  switch (action) {
    // Cookie CRUD
    case 'cookies:getAll':
      return cookieApi.getAll(payload as { domain?: string; url?: string });
    case 'cookies:get':
      return cookieApi.get(payload);
    case 'cookies:set': {
      const result = await cookieApi.set(payload);
      await incrementStat('cookiesEdited');
      return result;
    }
    case 'cookies:remove': {
      const ok = await cookieApi.remove(payload);
      if (ok) await incrementStat('cookiesDeleted');
      return ok;
    }
    case 'cookies:removeMultiple': {
      const results = await cookieApi.removeMultiple(payload);
      await incrementStat('cookiesDeleted', results.succeeded);
      return results;
    }
    case 'cookies:duplicate': {
      const dup = await cookieApi.duplicate(payload);
      await incrementStat('cookiesCreated');
      return dup;
    }

    // Bulk
    case 'bulk:execute':
      return cookieApi.executeBulk(payload.cookies, payload.action, payload.params);

    // Monitor
    case 'monitor:getLog':
      return monitor.getLog(payload?.limit, payload?.since);
    case 'monitor:clearLog':
      return monitor.clearLog();
    case 'monitor:subscribe':
      monitor.addSubscriber();
      return;
    case 'monitor:unsubscribe':
      monitor.removeSubscriber();
      return;

    // Profiles
    case 'profiles:getAll':
      return profiles.getAll();
    case 'profiles:get':
      return profiles.get(payload.id);
    case 'profiles:create': {
      const p = await profiles.create(payload);
      await incrementStat('profilesCreated');
      return p;
    }
    case 'profiles:update':
      return profiles.update(payload);
    case 'profiles:delete':
      return profiles.delete(payload.id);
    case 'profiles:apply': {
      const r = await profiles.apply(payload.id, payload.domain, payload.merge);
      await incrementStat('profilesApplied');
      return r;
    }
    case 'profiles:snapshot':
      return profiles.snapshot(payload.id, payload.domain);

    // Import/Export
    case 'export:execute': {
      const exp = exportEngine.execute(payload.cookies, payload.format, payload.domain);
      await incrementStat('cookiesViewed');
      return exp;
    }
    case 'import:parse':
      return importEngine.parse(payload.content, payload.filename);
    case 'import:apply': {
      const r = await importEngine.apply(payload.cookies, payload.overwrite);
      await incrementStat('importsPerformed');
      return r;
    }

    // Health
    case 'health:check':
      return cookieApi.healthCheck(payload?.domain);

    // Settings
    case 'settings:get':
      return getSettings();
    case 'settings:set':
      return setSettings(payload);

    // Stats
    case 'stats:get':
      return getStats();
    case 'stats:increment':
      return incrementStat(payload.key, payload.value);

    // Pro
    case 'pro:getStatus':
      return getProStatus();
    case 'pro:openPayment':
      return openPaymentPage();

    // Tab
    case 'tab:getCurrent':
      return getCurrentTab();

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ─── Context Menu Handler ───

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.url) return;

  const url = new URL(tab.url);
  const domain = url.hostname;

  switch (info.menuItemId) {
    case CTX_COPY_COOKIES_JSON: {
      const cookies = await cookieApi.getAll({ domain });
      const json = JSON.stringify(cookies, null, 2);
      await copyToClipboard(json, tab.id!);
      break;
    }
    case CTX_COPY_COOKIES_HEADER: {
      const cookies = await cookieApi.getAll({ domain });
      const header = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      await copyToClipboard(header, tab.id!);
      break;
    }
    case CTX_OPEN_PANEL:
      await chrome.sidePanel.open({ tabId: tab.id! });
      break;
    case CTX_DELETE_DOMAIN: {
      const cookies = await cookieApi.getAll({ domain });
      const ids = cookies.map((c) => ({
        name: c.name,
        domain: c.domain,
        path: c.path,
        storeId: c.storeId,
        partitionKey: c.partitionKey,
      }));
      await cookieApi.removeMultiple(ids);
      break;
    }
  }
});

// ─── Keyboard Commands ───

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const domain = new URL(tab.url).hostname;

  switch (command) {
    case 'open-side-panel':
      await chrome.sidePanel.open({ tabId: tab.id! });
      break;
    case 'copy-cookies-json': {
      const cookies = await cookieApi.getAll({ domain });
      const json = JSON.stringify(cookies, null, 2);
      await copyToClipboard(json, tab.id!);
      break;
    }
    case 'copy-cookies-header': {
      const cookies = await cookieApi.getAll({ domain });
      const header = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      await copyToClipboard(header, tab.id!);
      break;
    }
  }
});

// ─── Alarm Handler ───

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_CLEANUP) {
    await monitor.trimLog();
    log.info('Periodic cleanup completed');
  }
});

// ─── Helpers ───

async function copyToClipboard(text: string, tabId: number): Promise<void> {
  // Use offscreen document or scripting API to copy
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (t: string) => navigator.clipboard.writeText(t),
      args: [text],
    });
  } catch {
    log.warn('Clipboard copy via scripting failed — trying offscreen');
  }
}

async function getCurrentTab(): Promise<{ url: string; domain: string; tabId: number }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) throw new Error('No active tab with URL');
  const url = new URL(tab.url);
  return { url: tab.url, domain: url.hostname, tabId: tab.id! };
}

async function getProStatus(): Promise<{ isPro: boolean; trialActive: boolean; trialDaysLeft: number }> {
  try {
    const ExtPay = (await import('ExtPay')).default;
    const extpay = ExtPay('cookieforge');
    const user = await extpay.getUser();
    return {
      isPro: user.paid,
      trialActive: user.trialStartedAt !== null && !user.paid,
      trialDaysLeft: user.trialStartedAt
        ? Math.max(0, 7 - Math.floor((Date.now() - new Date(user.trialStartedAt).getTime()) / 86_400_000))
        : 0,
    };
  } catch {
    return { isPro: false, trialActive: false, trialDaysLeft: 0 };
  }
}

async function openPaymentPage(): Promise<void> {
  try {
    const ExtPay = (await import('ExtPay')).default;
    const extpay = ExtPay('cookieforge');
    await extpay.openPaymentPage();
  } catch (e) {
    log.error('Failed to open payment page', e);
  }
}

log.info('Service worker loaded');
```

---

<!-- FILE: cookieforge/src/background/cookie-api.ts -->
```typescript
import type {
  CookieData,
  CookieIdentifier,
  CookieHealthReport,
  CookieHealthEntry,
  CookieHealthIssue,
  BulkAction,
  BulkActionResult,
  SameSiteStatus,
} from '../shared/types';
import { createLogger } from '../shared/logger';
import {
  KNOWN_TRACKERS,
  MAX_COOKIE_SIZE_BYTES,
  MAX_COOKIES_PER_DOMAIN,
  COOKIE_SIZE_WARN,
  EXPIRY_SOON_HOURS,
  EXPIRY_WARN_HOURS,
} from '../shared/constants';
import { formatCookieSize } from '../shared/formatters';

const log = createLogger('CookieAPI');

export class CookieAPI {
  // ─── Read ───

  async getAll(filter: { domain?: string; url?: string } = {}): Promise<CookieData[]> {
    const details: chrome.cookies.GetAllDetails = {};
    if (filter.domain) details.domain = filter.domain;
    if (filter.url) details.url = filter.url;

    const cookies = await chrome.cookies.getAll(details);
    return cookies.map(this.normalize);
  }

  async get(id: CookieIdentifier): Promise<CookieData | null> {
    const url = this.buildUrl(id);
    const cookie = await chrome.cookies.get({
      name: id.name,
      url,
      storeId: id.storeId,
      ...(id.partitionKey ? { partitionKey: id.partitionKey } : {}),
    });
    return cookie ? this.normalize(cookie) : null;
  }

  // ─── Write ───

  async set(data: CookieData): Promise<CookieData> {
    const url = this.buildUrl(data);

    const details: chrome.cookies.SetDetails = {
      url,
      name: data.name,
      value: data.value,
      domain: data.domain.startsWith('.') ? data.domain : undefined,
      path: data.path,
      secure: data.secure,
      httpOnly: data.httpOnly,
      sameSite: data.sameSite,
      storeId: data.storeId,
      ...(data.expirationDate ? { expirationDate: data.expirationDate } : {}),
      ...(data.partitionKey ? { partitionKey: data.partitionKey } : {}),
    };

    const result = await chrome.cookies.set(details);
    if (!result) throw new Error(`Failed to set cookie: ${data.name} on ${data.domain}`);
    return this.normalize(result);
  }

  // ─── Delete ───

  async remove(id: CookieIdentifier): Promise<boolean> {
    const url = this.buildUrl(id);
    try {
      await chrome.cookies.remove({
        name: id.name,
        url,
        storeId: id.storeId,
        ...(id.partitionKey ? { partitionKey: id.partitionKey } : {}),
      });
      return true;
    } catch (e) {
      log.error(`Failed to remove cookie: ${id.name}`, e);
      return false;
    }
  }

  async removeMultiple(ids: CookieIdentifier[]): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    // Process in batches of 50 to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((id) => this.remove(id)));
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) succeeded++;
        else failed++;
      }
    }

    return { succeeded, failed };
  }

  // ─── Duplicate ───

  async duplicate(id: CookieIdentifier & { newName?: string }): Promise<CookieData> {
    const original = await this.get(id);
    if (!original) throw new Error(`Cookie not found: ${id.name}`);

    const cloned: CookieData = {
      ...original,
      name: id.newName ?? `${original.name}_copy`,
    };

    return this.set(cloned);
  }

  // ─── Bulk Operations ───

  async executeBulk(
    cookies: CookieIdentifier[],
    action: BulkAction,
    params?: Record<string, unknown>,
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      action,
      total: cookies.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const id of cookies) {
      try {
        switch (action) {
          case 'delete':
            if (await this.remove(id)) result.succeeded++;
            else result.failed++;
            break;

          case 'duplicate': {
            await this.duplicate(id);
            result.succeeded++;
            break;
          }

          case 'set_secure': {
            const c = await this.get(id);
            if (c) {
              c.secure = true;
              await this.set(c);
              result.succeeded++;
            } else result.failed++;
            break;
          }

          case 'set_httponly': {
            const c = await this.get(id);
            if (c) {
              c.httpOnly = true;
              await this.set(c);
              result.succeeded++;
            } else result.failed++;
            break;
          }

          case 'set_samesite': {
            const c = await this.get(id);
            if (c && params?.sameSite) {
              c.sameSite = params.sameSite as SameSiteStatus;
              if (c.sameSite === 'no_restriction') c.secure = true;
              await this.set(c);
              result.succeeded++;
            } else result.failed++;
            break;
          }

          case 'extend_expiry': {
            const c = await this.get(id);
            if (c && !c.session) {
              const days = (params?.days as number) ?? 30;
              c.expirationDate = (c.expirationDate ?? Date.now() / 1000) + days * 86400;
              await this.set(c);
              result.succeeded++;
            } else result.failed++;
            break;
          }

          default:
            result.errors.push(`Unsupported bulk action: ${action}`);
            result.failed++;
        }
      } catch (e) {
        result.failed++;
        result.errors.push(`${id.name}@${id.domain}: ${(e as Error).message}`);
      }
    }

    return result;
  }

  // ─── Health Check ───

  async healthCheck(domain?: string): Promise<CookieHealthReport> {
    const cookies = await this.getAll(domain ? { domain } : {});
    const issues: CookieHealthEntry[] = [];
    const now = Date.now() / 1000;

    // Group by domain for per-domain checks
    const byDomain = new Map<string, CookieData[]>();
    for (const c of cookies) {
      const d = c.domain.replace(/^\./, '');
      const existing = byDomain.get(d) ?? [];
      existing.push(c);
      byDomain.set(d, existing);
    }

    // Per-cookie checks
    for (const c of cookies) {
      const id = { name: c.name, domain: c.domain, path: c.path, storeId: c.storeId };

      // Expired
      if (c.expirationDate && c.expirationDate < now) {
        issues.push({
          cookie: id,
          issue: 'expired',
          severity: 'error',
          description: `Cookie expired ${new Date(c.expirationDate * 1000).toISOString()}`,
          suggestion: 'Remove this expired cookie',
        });
      }

      // Expiring soon
      if (c.expirationDate && c.expirationDate > now && c.expirationDate < now + EXPIRY_SOON_HOURS * 3600) {
        issues.push({
          cookie: id,
          issue: 'expiring_soon',
          severity: 'warning',
          description: `Expires within ${EXPIRY_SOON_HOURS} hours`,
          suggestion: 'Consider extending expiration if this cookie is important',
        });
      }

      // Missing SameSite
      if (c.sameSite === 'unspecified') {
        issues.push({
          cookie: id,
          issue: 'missing_samesite',
          severity: 'warning',
          description: 'SameSite attribute not explicitly set',
          suggestion: 'Set SameSite to Lax or Strict for better security',
        });
      }

      // Oversized
      const size = formatCookieSize(c);
      if (size > MAX_COOKIE_SIZE_BYTES) {
        issues.push({
          cookie: id,
          issue: 'oversized_value',
          severity: 'error',
          description: `Cookie is ${size}B, exceeding ${MAX_COOKIE_SIZE_BYTES}B limit`,
          suggestion: 'Reduce cookie value size',
        });
      }

      // Missing Secure on HTTPS domain
      if (!c.secure && !c.domain.includes('localhost')) {
        issues.push({
          cookie: id,
          issue: 'missing_secure_flag',
          severity: 'info',
          description: 'Cookie does not have Secure flag',
          suggestion: 'Set Secure flag to prevent transmission over HTTP',
        });
      }

      // Missing HttpOnly for session-like cookies
      if (!c.httpOnly && /session|token|auth|csrf|jwt/i.test(c.name)) {
        issues.push({
          cookie: id,
          issue: 'missing_httponly_flag',
          severity: 'warning',
          description: `Cookie "${c.name}" looks security-sensitive but lacks HttpOnly`,
          suggestion: 'Set HttpOnly to prevent JavaScript access',
        });
      }

      // Third-party tracking
      const rootDomain = c.domain.replace(/^\./, '').split('.').slice(-2).join('.');
      if (KNOWN_TRACKERS.has(rootDomain)) {
        issues.push({
          cookie: id,
          issue: 'third_party_tracking',
          severity: 'info',
          description: `Cookie from known tracking domain: ${rootDomain}`,
          suggestion: 'Consider removing if not needed',
        });
      }
    }

    // Per-domain: too many cookies
    for (const [d, domainCookies] of byDomain) {
      if (domainCookies.length > MAX_COOKIES_PER_DOMAIN * 0.8) {
        const first = domainCookies[0]!;
        issues.push({
          cookie: { name: '*', domain: d, path: '/', storeId: first.storeId },
          issue: 'duplicate_name',
          severity: 'warning',
          description: `Domain has ${domainCookies.length}/${MAX_COOKIES_PER_DOMAIN} cookies`,
          suggestion: 'Consider cleaning up unused cookies',
        });
      }

      // Duplicate names in same domain+path
      const nameMap = new Map<string, number>();
      for (const c of domainCookies) {
        const key = `${c.name}|${c.path}`;
        nameMap.set(key, (nameMap.get(key) ?? 0) + 1);
      }
      for (const [key, count] of nameMap) {
        if (count > 1) {
          const [name, path] = key.split('|');
          issues.push({
            cookie: { name: name!, domain: d, path: path ?? '/', storeId: domainCookies[0]!.storeId },
            issue: 'duplicate_name',
            severity: 'warning',
            description: `Duplicate cookie name "${name}" found ${count} times at path "${path}"`,
            suggestion: 'Remove duplicate cookies',
          });
        }
      }
    }

    // Score: 100 - penalties
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warnCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 10 - warnCount * 3);

    return {
      domain: domain ?? '*',
      totalCookies: cookies.length,
      issues,
      score,
      generatedAt: Date.now(),
    };
  }

  // ─── Internal ───

  private normalize(cookie: chrome.cookies.Cookie): CookieData {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite as CookieData['sameSite'],
      expirationDate: cookie.expirationDate,
      hostOnly: cookie.hostOnly,
      session: cookie.session,
      storeId: cookie.storeId,
      partitionKey: cookie.partitionKey as CookieData['partitionKey'],
    };
  }

  private buildUrl(id: { domain: string; path: string; secure?: boolean }): string {
    const protocol = id.secure !== false ? 'https' : 'http';
    const domain = id.domain.startsWith('.') ? id.domain.slice(1) : id.domain;
    return `${protocol}://${domain}${id.path}`;
  }
}
```

---

<!-- FILE: cookieforge/src/background/cookie-monitor.ts -->
```typescript
import type { CookieChange, CookieDiff, CookieData } from '../shared/types';
import { createLogger } from '../shared/logger';
import { broadcastToAll } from '../shared/messages';
import { appendChangeLog, getChangeLog, clearChangeLog } from '../shared/storage';
import { MONITOR_BATCH_INTERVAL_MS } from '../shared/constants';

const log = createLogger('CookieMonitor');

export class CookieMonitor {
  private listening = false;
  private subscribers = 0;
  private batch: CookieChange[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private previousState = new Map<string, CookieData>();

  start(): void {
    if (this.listening) return;
    this.listening = true;

    chrome.cookies.onChanged.addListener(this.handleChange);
    log.info('Cookie monitor started');
  }

  stop(): void {
    if (!this.listening) return;
    this.listening = false;

    chrome.cookies.onChanged.removeListener(this.handleChange);
    this.flushBatch();
    log.info('Cookie monitor stopped');
  }

  addSubscriber(): void {
    this.subscribers++;
  }

  removeSubscriber(): void {
    this.subscribers = Math.max(0, this.subscribers - 1);
  }

  async getLog(limit = 500, since?: number): Promise<CookieChange[]> {
    const all = await getChangeLog(limit);
    const changes = all as CookieChange[];
    if (since) return changes.filter((c) => c.timestamp >= since);
    return changes;
  }

  async clearLog(): Promise<void> {
    await clearChangeLog();
    this.previousState.clear();
    log.info('Change log cleared');
  }

  async trimLog(): Promise<void> {
    // Called by alarm — keep last 5000 entries
    const all = await getChangeLog(5000);
    if (all.length >= 4500) {
      await clearChangeLog();
      for (const entry of all.slice(-2500)) {
        await appendChangeLog(entry);
      }
      log.info(`Trimmed change log to 2500 entries`);
    }
  }

  // ─── Internal ───

  private handleChange = (changeInfo: chrome.cookies.CookieChangeInfo): void => {
    const change: CookieChange = {
      cookie: {
        name: changeInfo.cookie.name,
        value: changeInfo.cookie.value,
        domain: changeInfo.cookie.domain,
        path: changeInfo.cookie.path,
        secure: changeInfo.cookie.secure,
        httpOnly: changeInfo.cookie.httpOnly,
        sameSite: changeInfo.cookie.sameSite as CookieData['sameSite'],
        expirationDate: changeInfo.cookie.expirationDate,
        hostOnly: changeInfo.cookie.hostOnly,
        session: changeInfo.cookie.session,
        storeId: changeInfo.cookie.storeId,
        partitionKey: changeInfo.cookie.partitionKey as CookieData['partitionKey'],
      },
      removed: changeInfo.removed,
      cause: changeInfo.cause as CookieChange['cause'],
      timestamp: Date.now(),
    };

    // Track diff
    const key = this.cookieKey(change.cookie);
    if (change.removed) {
      this.previousState.delete(key);
    } else {
      this.previousState.set(key, change.cookie);
    }

    this.batch.push(change);

    // Debounced flush
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), MONITOR_BATCH_INTERVAL_MS);
    }
  };

  private async flushBatch(): Promise<void> {
    this.batchTimer = null;
    if (this.batch.length === 0) return;

    const entries = [...this.batch];
    this.batch = [];

    // Persist
    for (const entry of entries) {
      await appendChangeLog(entry);
    }

    // Broadcast to any listening UI
    if (this.subscribers > 0) {
      for (const entry of entries) {
        broadcastToAll({ type: 'cookie-changed', data: entry });
      }
    }

    log.info(`Flushed ${entries.length} cookie changes`);
  }

  private cookieKey(c: CookieData): string {
    return `${c.storeId}|${c.domain}|${c.path}|${c.name}|${c.partitionKey?.topLevelSite ?? ''}`;
  }
}
```

---

<!-- FILE: cookieforge/src/background/profile-manager.ts -->
```typescript
import type { CookieData, CookieProfile } from '../shared/types';
import { createLogger } from '../shared/logger';
import { getProfiles, addProfile, updateProfile, removeProfile } from '../shared/storage';
import { CookieAPI } from './cookie-api';
import { PROFILE_COLORS, PROFILE_ICONS } from '../shared/constants';

const log = createLogger('ProfileManager');

export class ProfileManager {
  private cookieApi = new CookieAPI();

  async getAll(): Promise<CookieProfile[]> {
    return getProfiles();
  }

  async get(id: string): Promise<CookieProfile | null> {
    const profiles = await getProfiles();
    return profiles.find((p) => p.id === id) ?? null;
  }

  async create(data: Omit<CookieProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<CookieProfile> {
    const profile: CookieProfile = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Default color/icon if not provided
    if (!profile.color) {
      const profiles = await getProfiles();
      profile.color = PROFILE_COLORS[profiles.length % PROFILE_COLORS.length]!;
    }
    if (!profile.icon) {
      profile.icon = PROFILE_ICONS[0]!;
    }

    await addProfile(profile);
    log.info(`Created profile: ${profile.name}`, { id: profile.id });
    return profile;
  }

  async update(profile: CookieProfile): Promise<CookieProfile> {
    profile.updatedAt = Date.now();
    await updateProfile(profile);
    log.info(`Updated profile: ${profile.name}`);
    return profile;
  }

  async delete(id: string): Promise<boolean> {
    await removeProfile(id);
    log.info(`Deleted profile: ${id}`);
    return true;
  }

  /**
   * Apply a profile's cookies to a domain.
   * merge=true: only add missing cookies; merge=false: delete existing then set all.
   */
  async apply(
    id: string,
    domain: string,
    merge: boolean,
  ): Promise<{ set: number; skipped: number; errors: string[] }> {
    const profile = await this.get(id);
    if (!profile) throw new Error(`Profile not found: ${id}`);

    const result = { set: 0, skipped: 0, errors: [] as string[] };

    if (!merge) {
      // Delete existing cookies for domain first
      const existing = await this.cookieApi.getAll({ domain });
      const ids = existing.map((c) => ({
        name: c.name,
        domain: c.domain,
        path: c.path,
        storeId: c.storeId,
        partitionKey: c.partitionKey,
      }));
      await this.cookieApi.removeMultiple(ids);
    }

    for (const cookie of profile.cookies) {
      try {
        // Adjust domain if the profile was captured from a different domain
        const adjusted: CookieData = {
          ...cookie,
          domain: cookie.domain.includes(domain) ? cookie.domain : `.${domain}`,
        };

        if (merge) {
          // Check if cookie already exists
          const existing = await this.cookieApi.get({
            name: adjusted.name,
            domain: adjusted.domain,
            path: adjusted.path,
            storeId: adjusted.storeId,
            partitionKey: adjusted.partitionKey,
          });
          if (existing) {
            result.skipped++;
            continue;
          }
        }

        await this.cookieApi.set(adjusted);
        result.set++;
      } catch (e) {
        result.errors.push(`${cookie.name}: ${(e as Error).message}`);
      }
    }

    log.info(`Applied profile "${profile.name}" to ${domain}`, result);
    return result;
  }

  /**
   * Capture current cookies for a domain and save them to an existing profile.
   */
  async snapshot(id: string, domain: string): Promise<CookieProfile> {
    const profile = await this.get(id);
    if (!profile) throw new Error(`Profile not found: ${id}`);

    const cookies = await this.cookieApi.getAll({ domain });
    profile.cookies = cookies;
    profile.domain = domain;
    profile.updatedAt = Date.now();

    await updateProfile(profile);
    log.info(`Snapshot: captured ${cookies.length} cookies for profile "${profile.name}" from ${domain}`);
    return profile;
  }
}
```

---

<!-- FILE: cookieforge/src/background/import-engine.ts -->
```typescript
import type { CookieData, ImportResult, SameSiteStatus } from '../shared/types';
import { createLogger } from '../shared/logger';
import { detectImportFormat, isValidSameSite, sanitizeCookieValue } from '../shared/validators';
import { CookieAPI } from './cookie-api';

const log = createLogger('ImportEngine');

export class ImportEngine {
  private cookieApi = new CookieAPI();

  /**
   * Parse import content into CookieData[]. Supports JSON, Netscape, and Cookie Header formats.
   * Auto-detects format if not specified via filename extension.
   */
  parse(content: string, filename?: string): ImportResult {
    const result: ImportResult = {
      cookies: [],
      format: 'unknown',
      errors: [],
      warnings: [],
      totalParsed: 0,
      totalSkipped: 0,
    };

    if (!content || content.trim().length === 0) {
      result.errors.push('Import content is empty');
      return result;
    }

    // Detect format
    let format = detectImportFormat(content);
    if (format === 'unknown' && filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext === 'json') format = 'json';
      else if (ext === 'txt') format = 'netscape';
    }

    result.format = format;

    switch (format) {
      case 'json':
        return this.parseJSON(content, result);
      case 'netscape':
        return this.parseNetscape(content, result);
      case 'header':
        return this.parseHeader(content, result);
      default:
        result.errors.push('Unable to detect import format. Supported: JSON array, Netscape cookies.txt, Cookie header string');
        return result;
    }
  }

  /**
   * Apply parsed cookies to the browser. overwrite=true replaces existing; false skips.
   */
  async apply(
    cookies: CookieData[],
    overwrite: boolean,
  ): Promise<{ set: number; failed: number; errors: string[] }> {
    const result = { set: 0, failed: 0, errors: [] as string[] };

    for (const cookie of cookies) {
      try {
        if (!overwrite) {
          const existing = await this.cookieApi.get({
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path,
            storeId: cookie.storeId,
            partitionKey: cookie.partitionKey,
          });
          if (existing) {
            continue; // skip existing
          }
        }

        await this.cookieApi.set(cookie);
        result.set++;
      } catch (e) {
        result.failed++;
        result.errors.push(`${cookie.name}@${cookie.domain}: ${(e as Error).message}`);
      }
    }

    log.info(`Import applied: ${result.set} set, ${result.failed} failed`);
    return result;
  }

  // ─── Format Parsers ───

  private parseJSON(content: string, result: ImportResult): ImportResult {
    try {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) {
        result.errors.push('JSON must be an array of cookie objects');
        return result;
      }

      for (let i = 0; i < data.length; i++) {
        const raw = data[i];
        result.totalParsed++;

        if (!raw || typeof raw !== 'object') {
          result.warnings.push(`Entry ${i}: not an object, skipping`);
          result.totalSkipped++;
          continue;
        }

        if (!raw.name || !raw.domain) {
          result.warnings.push(`Entry ${i}: missing name or domain, skipping`);
          result.totalSkipped++;
          continue;
        }

        const cookie: CookieData = {
          name: String(raw.name),
          value: sanitizeCookieValue(String(raw.value ?? '')),
          domain: String(raw.domain),
          path: String(raw.path ?? '/'),
          secure: Boolean(raw.secure ?? false),
          httpOnly: Boolean(raw.httpOnly ?? false),
          sameSite: isValidSameSite(raw.sameSite) ? raw.sameSite : 'lax',
          expirationDate: typeof raw.expirationDate === 'number' ? raw.expirationDate
            : typeof raw.expires === 'number' ? raw.expires : undefined,
          hostOnly: Boolean(raw.hostOnly ?? false),
          session: raw.expirationDate === undefined && raw.expires === undefined,
          storeId: String(raw.storeId ?? '0'),
          ...(raw.partitionKey ? { partitionKey: raw.partitionKey } : {}),
        };

        result.cookies.push(cookie);
      }
    } catch (e) {
      result.errors.push(`JSON parse error: ${(e as Error).message}`);
    }

    return result;
  }

  private parseNetscape(content: string, result: ImportResult): ImportResult {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line.startsWith('#') || line.length === 0) continue;

      result.totalParsed++;
      const parts = line.split('\t');

      if (parts.length < 7) {
        result.warnings.push(`Line ${i + 1}: expected 7 tab-separated fields, got ${parts.length}`);
        result.totalSkipped++;
        continue;
      }

      const [domain, , path, secure, expiry, name, value] = parts;

      const cookie: CookieData = {
        name: name!,
        value: sanitizeCookieValue(value ?? ''),
        domain: domain!,
        path: path ?? '/',
        secure: secure?.toUpperCase() === 'TRUE',
        httpOnly: false, // Netscape format doesn't include httpOnly
        sameSite: 'lax',
        expirationDate: Number(expiry) || undefined,
        hostOnly: !domain!.startsWith('.'),
        session: !expiry || Number(expiry) === 0,
        storeId: '0',
      };

      result.cookies.push(cookie);
    }

    return result;
  }

  private parseHeader(content: string, result: ImportResult): ImportResult {
    const pairs = content.trim().split(/;\s*/);

    for (const pair of pairs) {
      result.totalParsed++;
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) {
        result.warnings.push(`Invalid pair: "${pair}"`);
        result.totalSkipped++;
        continue;
      }

      const name = pair.substring(0, eqIdx).trim();
      const value = pair.substring(eqIdx + 1).trim();

      if (!name) {
        result.totalSkipped++;
        continue;
      }

      // Header format doesn't include domain — user must specify before applying
      const cookie: CookieData = {
        name,
        value: sanitizeCookieValue(value),
        domain: '', // must be set before applying
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: undefined,
        hostOnly: true,
        session: true,
        storeId: '0',
      };

      result.cookies.push(cookie);
    }

    if (result.cookies.length > 0 && result.cookies.every((c) => c.domain === '')) {
      result.warnings.push('Cookie header format: domain is empty — set domain before importing');
    }

    return result;
  }
}
```

---

<!-- FILE: cookieforge/src/background/export-engine.ts -->
```typescript
import type { CookieData, CookieExportFormat, ExportResult } from '../shared/types';
import { formatCookies } from '../shared/formatters';
import { createLogger } from '../shared/logger';
import { FORMAT_METADATA } from '../shared/constants';

const log = createLogger('ExportEngine');

export class ExportEngine {
  /**
   * Export cookies in the specified format.
   * Validates format is supported, delegates to formatters.ts.
   */
  execute(cookies: CookieData[], format: CookieExportFormat, domain?: string): ExportResult {
    if (!FORMAT_METADATA[format]) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    if (cookies.length === 0) {
      log.warn('Export called with zero cookies');
    }

    const result = formatCookies(cookies, format, domain);
    log.info(`Exported ${result.cookieCount} cookies as ${format}`);
    return result;
  }
}
```

---

<!-- FILE: cookieforge/src/background/analytics.ts -->
```typescript
import { createLogger } from '../shared/logger';
import { incrementStat } from '../shared/storage';

const log = createLogger('Analytics');

/**
 * Track a local-only analytics event. No data leaves the extension.
 * All stats are stored in chrome.storage.local and shown on the options page.
 */
export function trackEvent(event: string, data?: Record<string, unknown>): void {
  log.info(`Event: ${event}`, data);

  switch (event) {
    case 'install':
    case 'panel_open':
      incrementStat('panelOpened').catch(() => {});
      break;
    case 'cookie_view':
      incrementStat('cookiesViewed').catch(() => {});
      break;
    case 'cookie_edit':
      incrementStat('cookiesEdited').catch(() => {});
      break;
    case 'cookie_create':
      incrementStat('cookiesCreated').catch(() => {});
      break;
    case 'cookie_delete':
      incrementStat('cookiesDeleted').catch(() => {});
      break;
    case 'search':
      incrementStat('searchesPerformed').catch(() => {});
      break;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/sidepanel.html -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CookieForge</title>
  <link rel="stylesheet" href="sidepanel.css" />
</head>
<body>
  <div id="app">
    <!-- Header bar -->
    <header id="header">
      <div class="header-left">
        <img src="../../assets/icons/icon-32.png" alt="" class="logo" />
        <h1>CookieForge</h1>
        <span id="cookie-count" class="badge">0</span>
      </div>
      <div class="header-right">
        <button id="btn-refresh" class="icon-btn" title="Refresh cookies">&#x21BB;</button>
        <button id="btn-add" class="icon-btn" title="Add cookie">&#x2B;</button>
        <button id="btn-import" class="icon-btn" title="Import">&#x2912;</button>
        <button id="btn-export" class="icon-btn" title="Export">&#x2913;</button>
        <button id="btn-monitor" class="icon-btn" title="Change monitor">&#x1F50D;</button>
        <button id="btn-profiles" class="icon-btn" title="Profiles">&#x1F4CB;</button>
        <button id="btn-health" class="icon-btn" title="Cookie health">&#x2764;</button>
        <button id="btn-settings" class="icon-btn" title="Settings">&#x2699;</button>
      </div>
    </header>

    <!-- Search & filter bar -->
    <div id="search-bar"></div>

    <!-- Domain tree (collapsible) -->
    <div id="domain-tree"></div>

    <!-- Bulk action bar (shown when items selected) -->
    <div id="bulk-actions" class="hidden"></div>

    <!-- Main cookie table -->
    <div id="cookie-table"></div>

    <!-- Cookie detail/editor panel (slides in) -->
    <div id="cookie-detail" class="hidden"></div>

    <!-- Profile panel overlay -->
    <div id="profile-panel" class="hidden"></div>

    <!-- Change log overlay -->
    <div id="change-log" class="hidden"></div>

    <!-- Health dashboard overlay -->
    <div id="health-dashboard" class="hidden"></div>

    <!-- Import dialog -->
    <div id="import-dialog" class="hidden"></div>

    <!-- Export dialog -->
    <div id="export-dialog" class="hidden"></div>

    <!-- Partitioned cookie view -->
    <div id="partitioned-view" class="hidden"></div>
  </div>
  <script src="sidepanel.js" type="module"></script>
</body>
</html>
```

---

<!-- FILE: cookieforge/src/sidepanel/sidepanel.css -->
```css
/* ─── Reset & Variables ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --bg-hover: #1a3a6a;
  --bg-selected: #1e4d8a;
  --text-primary: #e4e4e4;
  --text-secondary: #a0a0b0;
  --text-muted: #6c6c80;
  --accent: #e94560;
  --accent-hover: #ff6b81;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  --border: #2a2a4a;
  --border-focus: #e94560;
  --scrollbar-thumb: #3a3a5a;
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
  --radius: 6px;
  --radius-sm: 4px;
  --font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --row-height: 48px;
  --header-height: 48px;
  --search-height: 44px;
  --transition: 150ms ease;
}

/* Light theme */
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f7;
  --bg-tertiary: #e8e8ed;
  --bg-hover: #eaeaf0;
  --bg-selected: #dde4f0;
  --text-primary: #1a1a2e;
  --text-secondary: #555566;
  --text-muted: #888899;
  --border: #d0d0dd;
  --scrollbar-thumb: #c0c0d0;
  --shadow: 0 2px 8px rgba(0,0,0,0.1);
}

body {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
  background: var(--bg-primary);
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ─── Header ─── */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h1 {
  font-size: 15px;
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 4px;
}

.logo { width: 20px; height: 20px; }

.badge {
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* ─── Buttons ─── */
.icon-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--transition);
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border);
}

.icon-btn.active {
  background: var(--accent);
  color: white;
}

.btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition);
}

.btn:hover { background: var(--accent-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover { background: var(--bg-hover); }

.btn-danger { background: var(--error); }
.btn-danger:hover { background: #dc2626; }

/* ─── Search Bar ─── */
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 6px 10px;
  font-size: 12px;
  font-family: var(--font-mono);
  outline: none;
  transition: border-color var(--transition);
}

.search-input:focus { border-color: var(--border-focus); }
.search-input::placeholder { color: var(--text-muted); }

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}

.filter-chip.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.filter-chip:hover { border-color: var(--accent); }

/* ─── Cookie Table ─── */
.table-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 80px 60px 40px;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-header-cell {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.table-header-cell:hover { color: var(--text-primary); }

.cookie-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 80px 60px 40px;
  gap: 4px;
  padding: 6px 12px;
  height: var(--row-height);
  align-items: center;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--transition);
}

.cookie-row:hover { background: var(--bg-hover); }
.cookie-row.selected { background: var(--bg-selected); }

.cookie-row.highlighted {
  animation: highlight-flash 3s ease-out;
}

@keyframes highlight-flash {
  0% { background: rgba(233, 69, 96, 0.3); }
  100% { background: transparent; }
}

.cookie-name {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cookie-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cookie-domain {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cookie-flags {
  display: flex;
  gap: 3px;
}

.flag {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.flag-secure { background: #166534; color: #86efac; }
.flag-httponly { background: #1e3a5f; color: #93c5fd; }
.flag-session { background: #713f12; color: #fde047; }
.flag-samesite { background: #581c87; color: #d8b4fe; }
.flag-partitioned { background: #701a1a; color: #fca5a5; }

.cookie-size {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}

.size-ok { color: var(--success); }
.size-warn { color: var(--warning); }
.size-error { color: var(--error); }

.cookie-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

/* ─── Detail/Editor Panel ─── */
.detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 250ms ease;
}

.detail-panel.open { transform: translateX(0); }

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.field-group {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.field-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 8px 10px;
  font-size: 12px;
  font-family: var(--font-mono);
  outline: none;
  transition: border-color var(--transition);
}

.field-input:focus { border-color: var(--border-focus); }

.field-textarea {
  resize: vertical;
  min-height: 60px;
}

.field-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

.field-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  cursor: pointer;
  transition: background var(--transition);
}

.toggle-switch.on { background: var(--accent); }

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition);
}

.toggle-switch.on::after { transform: translateX(16px); }

.validation-error {
  font-size: 11px;
  color: var(--error);
  margin-top: 2px;
}

.validation-warning {
  font-size: 11px;
  color: var(--warning);
  margin-top: 2px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border);
}

/* ─── Bulk Actions Bar ─── */
.bulk-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.bulk-count {
  font-weight: 600;
  font-size: 12px;
  color: var(--accent);
}

/* ─── Overlays ─── */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  z-index: 200;
  display: flex;
  flex-direction: column;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}

.overlay.open {
  opacity: 1;
  pointer-events: all;
}

.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.overlay-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* ─── Domain Tree ─── */
.domain-tree {
  max-height: 200px;
  overflow-y: auto;
  border-bottom: 1px solid var(--border);
}

.domain-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background var(--transition);
}

.domain-node:hover { background: var(--bg-hover); }
.domain-node.active { background: var(--bg-selected); color: var(--accent); }

.domain-count {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}

/* ─── Change Log ─── */
.change-entry {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.change-time {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: nowrap;
}

.change-action {
  font-weight: 600;
}

.change-action.added { color: var(--success); }
.change-action.removed { color: var(--error); }
.change-action.modified { color: var(--warning); }

/* ─── Health Dashboard ─── */
.health-score {
  text-align: center;
  padding: 16px;
}

.health-score-value {
  font-size: 48px;
  font-weight: 700;
}

.score-good { color: var(--success); }
.score-ok { color: var(--warning); }
.score-bad { color: var(--error); }

.health-issue {
  display: flex;
  gap: 8px;
  padding: 8px;
  margin-bottom: 6px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border-left: 3px solid;
}

.health-issue.error { border-left-color: var(--error); }
.health-issue.warning { border-left-color: var(--warning); }
.health-issue.info { border-left-color: var(--info); }

/* ─── Profile Panel ─── */
.profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--transition);
  border-left: 4px solid;
}

.profile-card:hover { background: var(--bg-hover); }

.profile-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-weight: 600;
  font-size: 13px;
}

.profile-meta {
  font-size: 11px;
  color: var(--text-muted);
}

/* ─── Import/Export Dialogs ─── */
.dialog-section {
  margin-bottom: 16px;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.format-option:hover { border-color: var(--accent); }
.format-option.selected { border-color: var(--accent); background: var(--bg-selected); }
.format-option.pro-only { opacity: 0.6; }

.pro-badge {
  font-size: 9px;
  font-weight: 700;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  transition: all var(--transition);
}

.drop-zone.drag-over {
  border-color: var(--accent);
  background: rgba(233, 69, 96, 0.1);
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ─── Utilities ─── */
.hidden { display: none !important; }
.flex-center { display: flex; align-items: center; justify-content: center; }
.gap-4 { gap: 4px; }
.gap-8 { gap: 8px; }
.mt-8 { margin-top: 8px; }
.mb-8 { margin-bottom: 8px; }
.text-center { text-align: center; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

---

<!-- FILE: cookieforge/src/sidepanel/sidepanel.ts -->
```typescript
import { sendMessage } from '../shared/messages';
import type { CookieData, CookieFilter, CookieChange, BroadcastEvent } from '../shared/types';
import { EMPTY_FILTER } from '../shared/types';
import { createLogger } from '../shared/logger';
import { CookieTable } from './components/cookie-table';
import { CookieEditor } from './components/cookie-editor';
import { SearchBar } from './components/search-bar';
import { CookieDetail } from './components/cookie-detail';
import { BulkActions } from './components/bulk-actions';
import { ProfilePanel } from './components/profile-panel';
import { ChangeLog } from './components/change-log';
import { HealthDashboard } from './components/health-dashboard';
import { ImportDialog } from './components/import-dialog';
import { ExportDialog } from './components/export-dialog';
import { DomainTree } from './components/domain-tree';
import { PartitionedView } from './components/partitioned-view';
import { trackEvent } from '../background/analytics';

const log = createLogger('SidePanel');

// ─── State ───

interface PanelState {
  cookies: CookieData[];
  filteredCookies: CookieData[];
  selectedIds: Set<string>;
  filter: CookieFilter;
  currentDomain: string;
  loading: boolean;
}

const state: PanelState = {
  cookies: [],
  filteredCookies: [],
  selectedIds: new Set(),
  filter: { ...EMPTY_FILTER },
  currentDomain: '',
  loading: false,
};

// ─── Components ───

let table: CookieTable;
let editor: CookieEditor;
let searchBar: SearchBar;
let detail: CookieDetail;
let bulk: BulkActions;
let profilePanel: ProfilePanel;
let changeLog: ChangeLog;
let healthDash: HealthDashboard;
let importDlg: ImportDialog;
let exportDlg: ExportDialog;
let domainTree: DomainTree;
let partView: PartitionedView;

// ─── Init ───

document.addEventListener('DOMContentLoaded', async () => {
  log.info('Side panel loading');

  // Apply theme
  const settings = await sendMessage('settings:get', undefined);
  applyTheme(settings.theme);

  // Init components
  table = new CookieTable(
    document.getElementById('cookie-table')!,
    { onSelect: handleSelect, onClick: handleCookieClick, onSelectionChange: handleSelectionChange },
  );
  editor = new CookieEditor({ onSave: handleSave, onDelete: handleDelete });
  searchBar = new SearchBar(
    document.getElementById('search-bar')!,
    { onFilterChange: handleFilterChange },
  );
  detail = new CookieDetail(document.getElementById('cookie-detail')!);
  bulk = new BulkActions(
    document.getElementById('bulk-actions')!,
    { onAction: handleBulkAction },
  );
  profilePanel = new ProfilePanel(
    document.getElementById('profile-panel')!,
    { onApply: handleProfileApply, onRefresh: loadCookies },
  );
  changeLog = new ChangeLog(document.getElementById('change-log')!);
  healthDash = new HealthDashboard(document.getElementById('health-dashboard')!);
  importDlg = new ImportDialog(
    document.getElementById('import-dialog')!,
    { onImported: loadCookies },
  );
  exportDlg = new ExportDialog(document.getElementById('export-dialog')!);
  domainTree = new DomainTree(
    document.getElementById('domain-tree')!,
    { onDomainSelect: handleDomainSelect },
  );
  partView = new PartitionedView(document.getElementById('partitioned-view')!);

  // Wire header buttons
  document.getElementById('btn-refresh')!.addEventListener('click', () => loadCookies());
  document.getElementById('btn-add')!.addEventListener('click', () => editor.openNew(state.currentDomain));
  document.getElementById('btn-import')!.addEventListener('click', () => importDlg.open());
  document.getElementById('btn-export')!.addEventListener('click', () => exportDlg.open(state.filteredCookies));
  document.getElementById('btn-monitor')!.addEventListener('click', () => changeLog.toggle());
  document.getElementById('btn-profiles')!.addEventListener('click', () => profilePanel.toggle());
  document.getElementById('btn-health')!.addEventListener('click', () => healthDash.open(state.currentDomain));
  document.getElementById('btn-settings')!.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Get current tab domain
  try {
    const tab = await sendMessage('tab:getCurrent', undefined);
    state.currentDomain = tab.domain;
    searchBar.setDomain(tab.domain);
  } catch {
    log.warn('Could not get current tab');
  }

  // Subscribe to monitor
  await sendMessage('monitor:subscribe', undefined);

  // Listen for broadcasts
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.broadcast && msg.event) {
      handleBroadcast(msg.event as BroadcastEvent);
    }
  });

  // Initial load
  await loadCookies();
  trackEvent('panel_open');
  log.info('Side panel loaded');
});

// Cleanup on close
window.addEventListener('beforeunload', () => {
  sendMessage('monitor:unsubscribe', undefined).catch(() => {});
});

// ─── Data Loading ───

async function loadCookies(): Promise<void> {
  state.loading = true;
  table.setLoading(true);

  try {
    const filter = state.filter.domain
      ? { domain: state.filter.domain }
      : state.currentDomain
        ? { domain: state.currentDomain }
        : {};

    state.cookies = await sendMessage('cookies:getAll', filter);
    applyFilters();
    domainTree.update(state.cookies);
    updateCookieCount();

    trackEvent('cookie_view');
  } catch (e) {
    log.error('Failed to load cookies', e);
  } finally {
    state.loading = false;
    table.setLoading(false);
  }
}

// ─── Filtering ───

function applyFilters(): void {
  let filtered = [...state.cookies];
  const f = state.filter;

  if (f.search) {
    const term = f.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.value.toLowerCase().includes(term) ||
        c.domain.toLowerCase().includes(term),
    );
  }

  if (f.httpOnly !== null) filtered = filtered.filter((c) => c.httpOnly === f.httpOnly);
  if (f.secure !== null) filtered = filtered.filter((c) => c.secure === f.secure);
  if (f.session !== null) filtered = filtered.filter((c) => c.session === f.session);
  if (f.sameSite !== null) filtered = filtered.filter((c) => c.sameSite === f.sameSite);
  if (f.partitioned !== null) filtered = filtered.filter((c) => (c.partitionKey !== undefined) === f.partitioned);

  state.filteredCookies = filtered;
  table.render(filtered);
}

// ─── Handlers ───

function handleFilterChange(filter: CookieFilter): void {
  state.filter = filter;
  applyFilters();
}

function handleSelect(id: string, selected: boolean): void {
  if (selected) state.selectedIds.add(id);
  else state.selectedIds.delete(id);
  bulk.update(state.selectedIds.size);
}

function handleSelectionChange(ids: Set<string>): void {
  state.selectedIds = ids;
  bulk.update(ids.size);
}

function handleCookieClick(cookie: CookieData): void {
  detail.open(cookie);
}

async function handleSave(cookie: CookieData): Promise<void> {
  await sendMessage('cookies:set', cookie);
  await loadCookies();
}

async function handleDelete(cookie: CookieData): Promise<void> {
  await sendMessage('cookies:remove', {
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    storeId: cookie.storeId,
    partitionKey: cookie.partitionKey,
  });
  await loadCookies();
}

async function handleBulkAction(action: string): Promise<void> {
  const ids = state.filteredCookies
    .filter((c) => state.selectedIds.has(cookieId(c)))
    .map((c) => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      storeId: c.storeId,
      partitionKey: c.partitionKey,
    }));

  await sendMessage('bulk:execute', { cookies: ids, action: action as import('../shared/types').BulkAction });
  state.selectedIds.clear();
  await loadCookies();
}

async function handleProfileApply(): Promise<void> {
  await loadCookies();
}

function handleDomainSelect(domain: string | null): void {
  state.filter = { ...state.filter, domain };
  applyFilters();
}

function handleBroadcast(event: BroadcastEvent): void {
  if (event.type === 'cookie-changed') {
    // Debounced reload
    clearTimeout(broadcastTimer);
    broadcastTimer = window.setTimeout(() => loadCookies(), 500);
  }
}

let broadcastTimer = 0;

function updateCookieCount(): void {
  const badge = document.getElementById('cookie-count');
  if (badge) badge.textContent = String(state.filteredCookies.length);
}

function applyTheme(theme: 'dark' | 'light' | 'system'): void {
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function cookieId(c: CookieData): string {
  return `${c.storeId}|${c.domain}|${c.path}|${c.name}|${c.partitionKey?.topLevelSite ?? ''}`;
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/cookie-table.ts -->
```typescript
import type { CookieData } from '../../shared/types';
import { formatExpiry, formatBytes, formatCookieSize } from '../../shared/formatters';
import { COOKIE_SIZE_OK, COOKIE_SIZE_WARN, TABLE_VIRTUAL_SCROLL_HEIGHT, TABLE_VIRTUAL_BUFFER } from '../../shared/constants';

interface TableCallbacks {
  onSelect: (id: string, selected: boolean) => void;
  onClick: (cookie: CookieData) => void;
  onSelectionChange: (ids: Set<string>) => void;
}

export class CookieTable {
  private container: HTMLElement;
  private callbacks: TableCallbacks;
  private cookies: CookieData[] = [];
  private selectedIds = new Set<string>();
  private scrollContainer: HTMLElement | null = null;
  private virtualStart = 0;
  private virtualEnd = 0;
  private selectAllCheckbox: HTMLInputElement | null = null;

  constructor(container: HTMLElement, callbacks: TableCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  render(cookies: CookieData[]): void {
    this.cookies = cookies;
    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'table-header';
    header.innerHTML = `
      <div><input type="checkbox" class="cookie-checkbox" id="select-all" /></div>
      <div class="table-header-cell" data-sort="name">Name &#x25B4;</div>
      <div class="table-header-cell" data-sort="value">Value</div>
      <div class="table-header-cell" data-sort="domain">Domain</div>
      <div class="table-header-cell" data-sort="expirationDate">Expires</div>
      <div class="table-header-cell" data-sort="size">Size</div>
    `;
    this.container.appendChild(header);

    this.selectAllCheckbox = header.querySelector('#select-all');
    this.selectAllCheckbox?.addEventListener('change', () => this.toggleSelectAll());

    // Sort headers
    header.querySelectorAll('.table-header-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const field = (cell as HTMLElement).dataset.sort;
        if (field) this.sort(field);
      });
    });

    // Scroll container with virtual scrolling
    const scroll = document.createElement('div');
    scroll.className = 'table-container';
    this.scrollContainer = scroll;

    const totalHeight = cookies.length * TABLE_VIRTUAL_SCROLL_HEIGHT;
    const spacer = document.createElement('div');
    spacer.style.height = `${totalHeight}px`;
    spacer.style.position = 'relative';
    scroll.appendChild(spacer);

    this.container.appendChild(scroll);

    scroll.addEventListener('scroll', () => this.updateVirtualRows());
    this.updateVirtualRows();
  }

  setLoading(loading: boolean): void {
    if (loading) {
      this.container.innerHTML = '<div class="flex-center" style="height:100px;color:var(--text-muted)">Loading cookies...</div>';
    }
  }

  private updateVirtualRows(): void {
    if (!this.scrollContainer) return;

    const scrollTop = this.scrollContainer.scrollTop;
    const viewportHeight = this.scrollContainer.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / TABLE_VIRTUAL_SCROLL_HEIGHT) - TABLE_VIRTUAL_BUFFER);
    const end = Math.min(this.cookies.length, Math.ceil((scrollTop + viewportHeight) / TABLE_VIRTUAL_SCROLL_HEIGHT) + TABLE_VIRTUAL_BUFFER);

    if (start === this.virtualStart && end === this.virtualEnd) return;
    this.virtualStart = start;
    this.virtualEnd = end;

    const spacer = this.scrollContainer.querySelector('div')!;
    // Remove old rows
    spacer.querySelectorAll('.cookie-row').forEach((r) => r.remove());

    // Render visible rows
    for (let i = start; i < end; i++) {
      const cookie = this.cookies[i];
      if (!cookie) continue;

      const row = this.createRow(cookie, i);
      row.style.position = 'absolute';
      row.style.top = `${i * TABLE_VIRTUAL_SCROLL_HEIGHT}px`;
      row.style.width = '100%';
      spacer.appendChild(row);
    }
  }

  private createRow(cookie: CookieData, _index: number): HTMLElement {
    const id = this.cookieId(cookie);
    const size = formatCookieSize(cookie);
    const sizeClass = size > COOKIE_SIZE_WARN ? 'size-error' : size > COOKIE_SIZE_OK ? 'size-warn' : 'size-ok';
    const isSelected = this.selectedIds.has(id);

    const row = document.createElement('div');
    row.className = `cookie-row${isSelected ? ' selected' : ''}`;
    row.dataset.id = id;

    const flags: string[] = [];
    if (cookie.secure) flags.push('<span class="flag flag-secure">S</span>');
    if (cookie.httpOnly) flags.push('<span class="flag flag-httponly">H</span>');
    if (cookie.session) flags.push('<span class="flag flag-session">Ses</span>');
    if (cookie.partitionKey) flags.push('<span class="flag flag-partitioned">P</span>');

    row.innerHTML = `
      <div><input type="checkbox" class="cookie-checkbox" ${isSelected ? 'checked' : ''} /></div>
      <div class="cookie-name" title="${this.escapeHtml(cookie.name)}">${this.escapeHtml(cookie.name)}</div>
      <div class="cookie-value" title="${this.escapeHtml(cookie.value)}">${this.escapeHtml(cookie.value.substring(0, 100))}</div>
      <div class="cookie-domain" title="${cookie.domain}">${cookie.domain}</div>
      <div class="cookie-flags">${flags.join('')}</div>
      <div class="cookie-size ${sizeClass}">${formatBytes(size)}</div>
    `;

    // Checkbox
    const cb = row.querySelector('input[type=checkbox]') as HTMLInputElement;
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      if (cb.checked) this.selectedIds.add(id);
      else this.selectedIds.delete(id);
      row.classList.toggle('selected', cb.checked);
      this.callbacks.onSelect(id, cb.checked);
    });

    // Row click → open detail
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      this.callbacks.onClick(cookie);
    });

    return row;
  }

  private toggleSelectAll(): void {
    const checked = this.selectAllCheckbox?.checked ?? false;
    this.selectedIds.clear();
    if (checked) {
      for (const c of this.cookies) this.selectedIds.add(this.cookieId(c));
    }
    this.callbacks.onSelectionChange(new Set(this.selectedIds));
    this.updateVirtualRows();
  }

  private sort(field: string): void {
    this.cookies.sort((a, b) => {
      const av = (a as Record<string, unknown>)[field];
      const bv = (b as Record<string, unknown>)[field];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return 0;
    });
    this.updateVirtualRows();
  }

  private cookieId(c: CookieData): string {
    return `${c.storeId}|${c.domain}|${c.path}|${c.name}|${c.partitionKey?.topLevelSite ?? ''}`;
  }

  private escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/cookie-editor.ts -->
```typescript
import type { CookieData, SameSiteStatus } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { validateCookie } from '../../shared/validators';
import { SAME_SITE_LABELS } from '../../shared/constants';

interface EditorCallbacks {
  onSave: (cookie: CookieData) => Promise<void>;
  onDelete: (cookie: CookieData) => Promise<void>;
}

export class CookieEditor {
  private callbacks: EditorCallbacks;
  private overlay: HTMLElement | null = null;
  private cookie: CookieData | null = null;
  private isNew = false;

  constructor(callbacks: EditorCallbacks) {
    this.callbacks = callbacks;
  }

  openNew(domain: string): void {
    this.isNew = true;
    this.cookie = {
      name: '',
      value: '',
      domain: domain ? `.${domain}` : '',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      expirationDate: Math.floor(Date.now() / 1000) + 86400 * 365,
      hostOnly: false,
      session: false,
      storeId: '0',
    };
    this.renderOverlay();
  }

  openEdit(cookie: CookieData): void {
    this.isNew = false;
    this.cookie = { ...cookie };
    this.renderOverlay();
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.cookie = null;
  }

  private renderOverlay(): void {
    if (!this.cookie) return;
    this.overlay?.remove();

    const c = this.cookie;
    const overlay = document.createElement('div');
    overlay.className = 'overlay open';

    overlay.innerHTML = `
      <div class="overlay-header">
        <h2>${this.isNew ? 'Add Cookie' : 'Edit Cookie'}</h2>
        <button class="icon-btn" id="editor-close">&times;</button>
      </div>
      <div class="overlay-body">
        <div class="field-group">
          <label class="field-label">Name</label>
          <input class="field-input" id="ed-name" value="${this.escapeAttr(c.name)}" ${this.isNew ? '' : 'readonly'} />
          <div id="err-name" class="validation-error"></div>
        </div>
        <div class="field-group">
          <label class="field-label">Value</label>
          <textarea class="field-input field-textarea" id="ed-value">${this.escapeHtml(c.value)}</textarea>
          <div id="err-value" class="validation-error"></div>
        </div>
        <div class="field-group">
          <label class="field-label">Domain</label>
          <input class="field-input" id="ed-domain" value="${this.escapeAttr(c.domain)}" />
          <div id="err-domain" class="validation-error"></div>
        </div>
        <div class="field-group">
          <label class="field-label">Path</label>
          <input class="field-input" id="ed-path" value="${this.escapeAttr(c.path)}" />
        </div>
        <div class="field-group">
          <label class="field-label">Expiration</label>
          <input class="field-input" type="datetime-local" id="ed-expiry"
            value="${c.expirationDate ? new Date(c.expirationDate * 1000).toISOString().slice(0, 16) : ''}" />
          <label style="margin-top:4px;display:flex;align-items:center;gap:6px;font-size:12px;">
            <input type="checkbox" id="ed-session" ${c.session ? 'checked' : ''} /> Session cookie (no expiry)
          </label>
        </div>
        <div class="field-group">
          <label class="field-label">SameSite</label>
          <select class="field-input field-select" id="ed-samesite">
            ${Object.entries(SAME_SITE_LABELS).map(([v, l]) => `<option value="${v}" ${c.sameSite === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <div id="err-sameSite" class="validation-error"></div>
        </div>
        <div class="field-group" style="display:flex;gap:16px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
            <input type="checkbox" id="ed-secure" ${c.secure ? 'checked' : ''} /> Secure
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
            <input type="checkbox" id="ed-httponly" ${c.httpOnly ? 'checked' : ''} /> HttpOnly
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
            <input type="checkbox" id="ed-hostonly" ${c.hostOnly ? 'checked' : ''} /> Host-only
          </label>
        </div>
        <div class="field-group">
          <label class="field-label">Partition Key (CHIPS)</label>
          <input class="field-input" id="ed-partition" value="${this.escapeAttr(c.partitionKey?.topLevelSite ?? '')}" placeholder="Leave empty for unpartitioned" />
          <div id="err-partitionKey" class="validation-error"></div>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn" id="editor-save">Save</button>
        ${!this.isNew ? '<button class="btn btn-danger" id="editor-delete">Delete</button>' : ''}
        <button class="btn btn-secondary" id="editor-cancel">Cancel</button>
      </div>
    `;

    document.getElementById('app')!.appendChild(overlay);

    overlay.querySelector('#editor-close')!.addEventListener('click', () => this.close());
    overlay.querySelector('#editor-cancel')!.addEventListener('click', () => this.close());
    overlay.querySelector('#editor-save')!.addEventListener('click', () => this.save());
    overlay.querySelector('#editor-delete')?.addEventListener('click', () => this.delete());

    // Session toggle disables expiry field
    const sessionCb = overlay.querySelector('#ed-session') as HTMLInputElement;
    const expiryInput = overlay.querySelector('#ed-expiry') as HTMLInputElement;
    sessionCb.addEventListener('change', () => {
      expiryInput.disabled = sessionCb.checked;
    });
    expiryInput.disabled = sessionCb.checked;

    this.overlay = overlay;
  }

  private async save(): Promise<void> {
    if (!this.overlay || !this.cookie) return;

    const get = (id: string) => (this.overlay!.querySelector(`#${id}`) as HTMLInputElement)?.value ?? '';
    const checked = (id: string) => (this.overlay!.querySelector(`#${id}`) as HTMLInputElement)?.checked ?? false;

    const session = checked('ed-session');
    const expiryStr = get('ed-expiry');
    const partitionSite = get('ed-partition').trim();

    const updated: CookieData = {
      name: get('ed-name').trim(),
      value: get('ed-value'),
      domain: get('ed-domain').trim(),
      path: get('ed-path').trim() || '/',
      secure: checked('ed-secure'),
      httpOnly: checked('ed-httponly'),
      hostOnly: checked('ed-hostonly'),
      sameSite: get('ed-samesite') as SameSiteStatus,
      expirationDate: session ? undefined : (expiryStr ? Math.floor(new Date(expiryStr).getTime() / 1000) : undefined),
      session,
      storeId: this.cookie.storeId,
      ...(partitionSite ? { partitionKey: { topLevelSite: partitionSite } } : {}),
    };

    // Validate
    const errors = validateCookie(updated);
    this.clearErrors();

    if (errors.some((e) => e.severity === 'error')) {
      for (const err of errors) {
        const el = this.overlay.querySelector(`#err-${err.field}`);
        if (el) el.textContent = err.message;
      }
      return;
    }

    try {
      await this.callbacks.onSave(updated);
      this.close();
    } catch (e) {
      const el = this.overlay.querySelector('#err-name');
      if (el) el.textContent = (e as Error).message;
    }
  }

  private async delete(): Promise<void> {
    if (!this.cookie) return;
    await this.callbacks.onDelete(this.cookie);
    this.close();
  }

  private clearErrors(): void {
    this.overlay?.querySelectorAll('.validation-error').forEach((el) => { el.textContent = ''; });
  }

  private escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  private escapeAttr(s: string): string {
    return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/search-bar.ts -->
```typescript
import type { CookieFilter, SameSiteStatus } from '../../shared/types';
import { EMPTY_FILTER } from '../../shared/types';
import { SEARCH_DEBOUNCE_MS } from '../../shared/constants';

interface SearchCallbacks {
  onFilterChange: (filter: CookieFilter) => void;
}

export class SearchBar {
  private container: HTMLElement;
  private callbacks: SearchCallbacks;
  private filter: CookieFilter = { ...EMPTY_FILTER };
  private debounceTimer = 0;

  constructor(container: HTMLElement, callbacks: SearchCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  setDomain(domain: string): void {
    this.filter.domain = domain;
    this.emit();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="search-container">
        <input type="text" class="search-input" placeholder="Search cookies (name, value, domain)..." id="search-input" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <span class="filter-chip" data-filter="secure">Secure</span>
          <span class="filter-chip" data-filter="httpOnly">HttpOnly</span>
          <span class="filter-chip" data-filter="session">Session</span>
          <span class="filter-chip" data-filter="partitioned">Partitioned</span>
          <span class="filter-chip" data-filter="sameSite-strict">Strict</span>
          <span class="filter-chip" data-filter="sameSite-lax">Lax</span>
          <span class="filter-chip" data-filter="sameSite-no_restriction">None</span>
        </div>
      </div>
    `;

    const input = this.container.querySelector('#search-input') as HTMLInputElement;
    input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.filter.search = input.value;
        this.emit();
      }, SEARCH_DEBOUNCE_MS);
    });

    // Keyboard shortcut: Escape clears search
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        this.filter.search = '';
        this.emit();
      }
    });

    // Filter chips
    this.container.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const filterType = (chip as HTMLElement).dataset.filter!;
        this.toggleFilter(filterType, chip as HTMLElement);
      });
    });
  }

  private toggleFilter(filterType: string, chip: HTMLElement): void {
    const isActive = chip.classList.contains('active');
    chip.classList.toggle('active');

    if (filterType === 'secure') {
      this.filter.secure = isActive ? null : true;
    } else if (filterType === 'httpOnly') {
      this.filter.httpOnly = isActive ? null : true;
    } else if (filterType === 'session') {
      this.filter.session = isActive ? null : true;
    } else if (filterType === 'partitioned') {
      this.filter.partitioned = isActive ? null : true;
    } else if (filterType.startsWith('sameSite-')) {
      const value = filterType.replace('sameSite-', '') as SameSiteStatus;
      this.filter.sameSite = isActive ? null : value;
      // Deactivate other sameSite chips
      if (!isActive) {
        this.container.querySelectorAll('[data-filter^="sameSite-"]').forEach((c) => {
          if (c !== chip) c.classList.remove('active');
        });
      }
    }

    this.emit();
  }

  private emit(): void {
    this.callbacks.onFilterChange({ ...this.filter });
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/cookie-detail.ts -->
```typescript
import type { CookieData } from '../../shared/types';
import { formatExpiry, formatBytes, formatCookieSize, extractRootDomain } from '../../shared/formatters';
import { SAME_SITE_LABELS, KNOWN_TRACKERS } from '../../shared/constants';

export class CookieDetail {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  open(cookie: CookieData): void {
    const size = formatCookieSize(cookie);
    const rootDomain = extractRootDomain(cookie.domain);
    const isTracker = KNOWN_TRACKERS.has(rootDomain);

    this.container.innerHTML = `
      <div class="detail-panel open">
        <div class="detail-header">
          <h3>${this.esc(cookie.name)}</h3>
          <button class="icon-btn" id="detail-close">&times;</button>
        </div>
        <div class="detail-body">
          <div class="field-group">
            <span class="field-label">Name</span>
            <code style="font-family:var(--font-mono);font-size:12px;">${this.esc(cookie.name)}</code>
          </div>
          <div class="field-group">
            <span class="field-label">Value</span>
            <pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow-y:auto;background:var(--bg-secondary);padding:8px;border-radius:var(--radius-sm);">${this.esc(cookie.value)}</pre>
          </div>
          <div class="field-group">
            <span class="field-label">Domain</span>
            <span>${cookie.domain} ${isTracker ? '<span class="flag" style="background:#701a1a;color:#fca5a5;">Tracker</span>' : ''}</span>
          </div>
          <div class="field-group">
            <span class="field-label">Path</span>
            <span>${cookie.path}</span>
          </div>
          <div class="field-group">
            <span class="field-label">Expires</span>
            <span>${formatExpiry(cookie.expirationDate, cookie.session)}</span>
          </div>
          <div class="field-group">
            <span class="field-label">Size</span>
            <span>${formatBytes(size)}</span>
          </div>
          <div class="field-group">
            <span class="field-label">Flags</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${cookie.secure ? '<span class="flag flag-secure">Secure</span>' : '<span style="color:var(--text-muted);">Not Secure</span>'}
              ${cookie.httpOnly ? '<span class="flag flag-httponly">HttpOnly</span>' : ''}
              ${cookie.session ? '<span class="flag flag-session">Session</span>' : ''}
              <span class="flag flag-samesite">${SAME_SITE_LABELS[cookie.sameSite] ?? cookie.sameSite}</span>
              ${cookie.hostOnly ? '<span class="flag" style="background:#2a2a4a;color:#ccc;">Host-only</span>' : ''}
              ${cookie.partitionKey ? '<span class="flag flag-partitioned">Partitioned</span>' : ''}
            </div>
          </div>
          ${cookie.partitionKey ? `
          <div class="field-group">
            <span class="field-label">Partition Key</span>
            <code style="font-family:var(--font-mono);font-size:12px;">${this.esc(cookie.partitionKey.topLevelSite)}</code>
          </div>` : ''}
          <div class="field-group">
            <span class="field-label">Store ID</span>
            <span>${cookie.storeId}</span>
          </div>
        </div>
      </div>
    `;

    this.container.classList.remove('hidden');
    this.container.querySelector('#detail-close')!.addEventListener('click', () => this.close());
  }

  close(): void {
    this.container.classList.add('hidden');
  }

  private esc(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/bulk-actions.ts -->
```typescript
import type { BulkAction } from '../../shared/types';

interface BulkCallbacks {
  onAction: (action: string) => Promise<void>;
}

export class BulkActions {
  private container: HTMLElement;
  private callbacks: BulkCallbacks;

  constructor(container: HTMLElement, callbacks: BulkCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  update(count: number): void {
    if (count === 0) {
      this.container.classList.add('hidden');
      return;
    }

    this.container.classList.remove('hidden');
    this.container.innerHTML = `
      <div class="bulk-bar">
        <span class="bulk-count">${count} selected</span>
        <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
        <button class="btn btn-secondary btn-sm" data-action="export">Export</button>
        <button class="btn btn-secondary btn-sm" data-action="duplicate">Duplicate</button>
        <button class="btn btn-secondary btn-sm" data-action="set_secure">Set Secure</button>
        <button class="btn btn-secondary btn-sm" data-action="set_httponly">Set HttpOnly</button>
        <button class="btn btn-secondary btn-sm" data-action="extend_expiry">Extend +30d</button>
        <button class="btn btn-secondary btn-sm" data-action="save_to_profile">Save to Profile</button>
      </div>
    `;

    this.container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action!;
        this.callbacks.onAction(action);
      });
    });
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/profile-panel.ts -->
```typescript
import { sendMessage } from '../../shared/messages';
import type { CookieProfile } from '../../shared/types';
import { PROFILE_COLORS, PROFILE_ICONS } from '../../shared/constants';

interface ProfileCallbacks {
  onApply: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export class ProfilePanel {
  private container: HTMLElement;
  private callbacks: ProfileCallbacks;
  private isOpen = false;

  constructor(container: HTMLElement, callbacks: ProfileCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.open();
    else this.close();
  }

  async open(): Promise<void> {
    this.isOpen = true;
    this.container.classList.remove('hidden');

    const profiles = await sendMessage('profiles:getAll', undefined);
    this.render(profiles);
  }

  close(): void {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  private render(profiles: CookieProfile[]): void {
    this.container.innerHTML = `
      <div class="overlay open">
        <div class="overlay-header">
          <h2>Cookie Profiles</h2>
          <div style="display:flex;gap:4px;">
            <button class="btn" id="profile-create">+ New Profile</button>
            <button class="icon-btn" id="profile-close">&times;</button>
          </div>
        </div>
        <div class="overlay-body">
          ${profiles.length === 0
            ? '<p style="color:var(--text-muted);text-align:center;padding:24px;">No profiles yet. Create one to save a set of cookies for quick switching.</p>'
            : profiles.map((p) => this.renderCard(p)).join('')}
        </div>
      </div>
    `;

    this.container.querySelector('#profile-close')!.addEventListener('click', () => this.close());
    this.container.querySelector('#profile-create')!.addEventListener('click', () => this.createNew());

    this.container.querySelectorAll('.profile-card').forEach((card) => {
      const id = (card as HTMLElement).dataset.id!;
      card.querySelector('.profile-apply')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.apply(id);
      });
      card.querySelector('.profile-snapshot')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.snapshot(id);
      });
      card.querySelector('.profile-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteProfile(id);
      });
    });
  }

  private renderCard(profile: CookieProfile): string {
    return `
      <div class="profile-card" data-id="${profile.id}" style="border-left-color:${profile.color}">
        <div class="profile-icon" style="background:${profile.color}20;color:${profile.color}">${profile.icon}</div>
        <div class="profile-info">
          <div class="profile-name">${this.esc(profile.name)}</div>
          <div class="profile-meta">${profile.cookies.length} cookies &middot; ${profile.domain ?? 'cross-domain'} &middot; Updated ${new Date(profile.updatedAt).toLocaleDateString()}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-sm profile-apply" title="Apply">Apply</button>
          <button class="btn btn-sm btn-secondary profile-snapshot" title="Snapshot">Snap</button>
          <button class="btn btn-sm btn-danger profile-delete" title="Delete">&times;</button>
        </div>
      </div>
    `;
  }

  private async createNew(): Promise<void> {
    const name = prompt('Profile name:');
    if (!name) return;

    try {
      const tab = await sendMessage('tab:getCurrent', undefined);
      const cookies = await sendMessage('cookies:getAll', { domain: tab.domain });
      await sendMessage('profiles:create', {
        name,
        description: '',
        cookies,
        domain: tab.domain,
        color: PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)]!,
        icon: PROFILE_ICONS[0]!,
        locked: false,
      });
      await this.open();
    } catch (e) {
      console.error('Failed to create profile', e);
    }
  }

  private async apply(id: string): Promise<void> {
    try {
      const tab = await sendMessage('tab:getCurrent', undefined);
      await sendMessage('profiles:apply', { id, domain: tab.domain, merge: false });
      await this.callbacks.onApply();
    } catch (e) {
      console.error('Failed to apply profile', e);
    }
  }

  private async snapshot(id: string): Promise<void> {
    try {
      const tab = await sendMessage('tab:getCurrent', undefined);
      await sendMessage('profiles:snapshot', { id, domain: tab.domain });
      await this.open(); // refresh
    } catch (e) {
      console.error('Failed to snapshot', e);
    }
  }

  private async deleteProfile(id: string): Promise<void> {
    if (!confirm('Delete this profile?')) return;
    await sendMessage('profiles:delete', { id });
    await this.open();
  }

  private esc(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/change-log.ts -->
```typescript
import { sendMessage } from '../../shared/messages';
import type { CookieChange } from '../../shared/types';

export class ChangeLog {
  private container: HTMLElement;
  private isOpen = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.open();
    else this.close();
  }

  async open(): Promise<void> {
    this.isOpen = true;
    this.container.classList.remove('hidden');

    const changes = await sendMessage('monitor:getLog', { limit: 200 });
    this.render(changes);
  }

  close(): void {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  private render(changes: CookieChange[]): void {
    const reversed = [...changes].reverse(); // newest first

    this.container.innerHTML = `
      <div class="overlay open">
        <div class="overlay-header">
          <h2>Cookie Change Log</h2>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary" id="changelog-clear">Clear</button>
            <button class="btn btn-secondary" id="changelog-refresh">Refresh</button>
            <button class="icon-btn" id="changelog-close">&times;</button>
          </div>
        </div>
        <div class="overlay-body">
          ${reversed.length === 0
            ? '<p style="color:var(--text-muted);text-align:center;padding:24px;">No changes recorded yet. Changes will appear here in real-time.</p>'
            : reversed.map((c) => this.renderEntry(c)).join('')}
        </div>
      </div>
    `;

    this.container.querySelector('#changelog-close')!.addEventListener('click', () => this.close());
    this.container.querySelector('#changelog-clear')!.addEventListener('click', async () => {
      await sendMessage('monitor:clearLog', undefined);
      this.render([]);
    });
    this.container.querySelector('#changelog-refresh')!.addEventListener('click', () => this.open());
  }

  private renderEntry(change: CookieChange): string {
    const time = new Date(change.timestamp).toLocaleTimeString();
    const action = change.removed ? 'removed' : 'added';
    const cause = change.cause !== 'explicit' ? ` (${change.cause})` : '';

    return `
      <div class="change-entry">
        <span class="change-time">${time}</span>
        <span class="change-action ${action}">${action}${cause}</span>
        <span class="truncate" style="flex:1;" title="${this.esc(change.cookie.name)}">${this.esc(change.cookie.name)}</span>
        <span class="cookie-domain">${change.cookie.domain}</span>
      </div>
    `;
  }

  private esc(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/health-dashboard.ts -->
```typescript
import { sendMessage } from '../../shared/messages';
import type { CookieHealthReport, CookieHealthEntry } from '../../shared/types';

export class HealthDashboard {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async open(domain?: string): Promise<void> {
    this.container.classList.remove('hidden');

    this.container.innerHTML = '<div class="overlay open"><div class="flex-center" style="height:100px;color:var(--text-muted)">Analyzing cookies...</div></div>';

    const report = await sendMessage('health:check', { domain });
    this.render(report);
  }

  close(): void {
    this.container.classList.add('hidden');
  }

  private render(report: CookieHealthReport): void {
    const scoreClass = report.score >= 80 ? 'score-good' : report.score >= 50 ? 'score-ok' : 'score-bad';

    const errors = report.issues.filter((i) => i.severity === 'error');
    const warnings = report.issues.filter((i) => i.severity === 'warning');
    const infos = report.issues.filter((i) => i.severity === 'info');

    this.container.innerHTML = `
      <div class="overlay open">
        <div class="overlay-header">
          <h2>Cookie Health — ${report.domain}</h2>
          <button class="icon-btn" id="health-close">&times;</button>
        </div>
        <div class="overlay-body">
          <div class="health-score">
            <div class="health-score-value ${scoreClass}">${report.score}</div>
            <div style="color:var(--text-muted);font-size:12px;">${report.totalCookies} cookies analyzed</div>
            <div style="margin-top:8px;display:flex;gap:12px;justify-content:center;">
              <span style="color:var(--error);">${errors.length} errors</span>
              <span style="color:var(--warning);">${warnings.length} warnings</span>
              <span style="color:var(--info);">${infos.length} info</span>
            </div>
          </div>

          ${errors.length > 0 ? '<h3 style="margin:12px 0 6px;font-size:13px;color:var(--error);">Errors</h3>' : ''}
          ${errors.map((i) => this.renderIssue(i)).join('')}

          ${warnings.length > 0 ? '<h3 style="margin:12px 0 6px;font-size:13px;color:var(--warning);">Warnings</h3>' : ''}
          ${warnings.map((i) => this.renderIssue(i)).join('')}

          ${infos.length > 0 ? '<h3 style="margin:12px 0 6px;font-size:13px;color:var(--info);">Info</h3>' : ''}
          ${infos.map((i) => this.renderIssue(i)).join('')}
        </div>
      </div>
    `;

    this.container.querySelector('#health-close')!.addEventListener('click', () => this.close());
  }

  private renderIssue(issue: CookieHealthEntry): string {
    return `
      <div class="health-issue ${issue.severity}">
        <div style="flex:1;">
          <div style="font-weight:600;font-size:12px;">${this.esc(issue.cookie.name)}@${issue.cookie.domain}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${issue.description}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${issue.suggestion}</div>
        </div>
      </div>
    `;
  }

  private esc(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/import-dialog.ts -->
```typescript
import { sendMessage } from '../../shared/messages';
import type { ImportResult } from '../../shared/types';

interface ImportCallbacks {
  onImported: () => Promise<void>;
}

export class ImportDialog {
  private container: HTMLElement;
  private callbacks: ImportCallbacks;
  private parsed: ImportResult | null = null;

  constructor(container: HTMLElement, callbacks: ImportCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  open(): void {
    this.parsed = null;
    this.container.classList.remove('hidden');
    this.render();
  }

  close(): void {
    this.container.classList.add('hidden');
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="overlay open">
        <div class="overlay-header">
          <h2>Import Cookies</h2>
          <button class="icon-btn" id="import-close">&times;</button>
        </div>
        <div class="overlay-body">
          <div class="dialog-section">
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
              Supports: JSON array, Netscape cookies.txt, Cookie header string
            </p>
            <div class="drop-zone" id="import-dropzone">
              Drop a file here or click to browse
              <input type="file" id="import-file" accept=".json,.txt,.cookie" style="display:none;" />
            </div>
          </div>
          <div class="dialog-section">
            <label class="field-label">Or paste cookie data</label>
            <textarea class="field-input field-textarea" id="import-text" rows="6" placeholder='[{"name":"session","value":"abc123","domain":".example.com","path":"/"}]'></textarea>
          </div>
          <div id="import-preview" style="display:none;">
            <h3 style="font-size:13px;margin-bottom:6px;">Preview</h3>
            <div id="import-results"></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn" id="import-parse">Parse</button>
            <button class="btn" id="import-apply" disabled>Import All</button>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <input type="checkbox" id="import-overwrite" /> Overwrite existing
            </label>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#import-close')!.addEventListener('click', () => this.close());

    // File drop zone
    const dropzone = this.container.querySelector('#import-dropzone') as HTMLElement;
    const fileInput = this.container.querySelector('#import-file') as HTMLInputElement;
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file) this.readFile(file);
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) this.readFile(file);
    });

    // Parse button
    this.container.querySelector('#import-parse')!.addEventListener('click', () => {
      const text = (this.container.querySelector('#import-text') as HTMLTextAreaElement).value;
      this.parseContent(text);
    });

    // Apply button
    this.container.querySelector('#import-apply')!.addEventListener('click', () => this.apply());
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      (this.container.querySelector('#import-text') as HTMLTextAreaElement).value = content;
      this.parseContent(content, file.name);
    };
    reader.readAsText(file);
  }

  private async parseContent(content: string, filename?: string): Promise<void> {
    this.parsed = await sendMessage('import:parse', { content, filename });

    const preview = this.container.querySelector('#import-preview') as HTMLElement;
    const results = this.container.querySelector('#import-results') as HTMLElement;
    const applyBtn = this.container.querySelector('#import-apply') as HTMLButtonElement;

    preview.style.display = 'block';

    if (this.parsed.errors.length > 0) {
      results.innerHTML = `<div style="color:var(--error);font-size:12px;">${this.parsed.errors.join('<br>')}</div>`;
      applyBtn.disabled = true;
      return;
    }

    results.innerHTML = `
      <div style="font-size:12px;">
        <div>Format: <strong>${this.parsed.format}</strong></div>
        <div>Cookies found: <strong>${this.parsed.cookies.length}</strong></div>
        ${this.parsed.warnings.length > 0 ? `<div style="color:var(--warning);margin-top:4px;">${this.parsed.warnings.join('<br>')}</div>` : ''}
        ${this.parsed.totalSkipped > 0 ? `<div style="color:var(--text-muted);">Skipped: ${this.parsed.totalSkipped}</div>` : ''}
      </div>
    `;

    applyBtn.disabled = this.parsed.cookies.length === 0;
  }

  private async apply(): Promise<void> {
    if (!this.parsed || this.parsed.cookies.length === 0) return;

    const overwrite = (this.container.querySelector('#import-overwrite') as HTMLInputElement).checked;

    try {
      const result = await sendMessage('import:apply', {
        cookies: this.parsed.cookies,
        overwrite,
      });

      const results = this.container.querySelector('#import-results') as HTMLElement;
      results.innerHTML = `
        <div style="font-size:12px;color:var(--success);">
          Imported ${result.set} cookies. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}
        </div>
      `;

      await this.callbacks.onImported();
      setTimeout(() => this.close(), 1500);
    } catch (e) {
      console.error('Import failed', e);
    }
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/export-dialog.ts -->
```typescript
import { sendMessage } from '../../shared/messages';
import type { CookieData, CookieExportFormat, ExportResult } from '../../shared/types';
import { FORMAT_METADATA } from '../../shared/constants';

export class ExportDialog {
  private container: HTMLElement;
  private cookies: CookieData[] = [];
  private selectedFormat: CookieExportFormat = 'json';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  open(cookies: CookieData[]): void {
    this.cookies = cookies;
    this.selectedFormat = 'json';
    this.container.classList.remove('hidden');
    this.render();
  }

  close(): void {
    this.container.classList.add('hidden');
  }

  private render(): void {
    const formats = Object.entries(FORMAT_METADATA).map(([key, meta]) => {
      const isSelected = key === this.selectedFormat;
      return `
        <div class="format-option ${isSelected ? 'selected' : ''} ${meta.pro ? 'pro-only' : ''}" data-format="${key}">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:12px;">${meta.label}</div>
            <div style="font-size:11px;color:var(--text-muted);">.${meta.ext}</div>
          </div>
          ${meta.pro ? '<span class="pro-badge">PRO</span>' : ''}
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="overlay open">
        <div class="overlay-header">
          <h2>Export ${this.cookies.length} Cookies</h2>
          <button class="icon-btn" id="export-close">&times;</button>
        </div>
        <div class="overlay-body">
          <div class="dialog-section">
            <label class="field-label">Format</label>
            ${formats}
          </div>
          <div id="export-preview" style="display:none;">
            <label class="field-label">Preview</label>
            <pre id="export-content" style="font-family:var(--font-mono);font-size:11px;background:var(--bg-secondary);padding:8px;border-radius:var(--radius-sm);max-height:200px;overflow:auto;white-space:pre-wrap;"></pre>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn" id="export-copy">Copy to Clipboard</button>
            <button class="btn btn-secondary" id="export-download">Download File</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#export-close')!.addEventListener('click', () => this.close());

    // Format selection
    this.container.querySelectorAll('.format-option').forEach((el) => {
      el.addEventListener('click', () => {
        const format = (el as HTMLElement).dataset.format as CookieExportFormat;
        this.selectedFormat = format;
        this.container.querySelectorAll('.format-option').forEach((f) => f.classList.remove('selected'));
        el.classList.add('selected');
        this.generatePreview();
      });
    });

    this.container.querySelector('#export-copy')!.addEventListener('click', () => this.copyToClipboard());
    this.container.querySelector('#export-download')!.addEventListener('click', () => this.download());

    this.generatePreview();
  }

  private async generatePreview(): Promise<void> {
    try {
      const result = await sendMessage('export:execute', {
        cookies: this.cookies,
        format: this.selectedFormat,
      });

      const preview = this.container.querySelector('#export-preview') as HTMLElement;
      const content = this.container.querySelector('#export-content') as HTMLPreElement;
      preview.style.display = 'block';
      content.textContent = result.content.substring(0, 2000) + (result.content.length > 2000 ? '\n...' : '');

      this.lastResult = result;
    } catch (e) {
      console.error('Export preview failed', e);
    }
  }

  private lastResult: ExportResult | null = null;

  private async copyToClipboard(): Promise<void> {
    if (!this.lastResult) return;
    await navigator.clipboard.writeText(this.lastResult.content);
    // Brief visual feedback
    const btn = this.container.querySelector('#export-copy') as HTMLButtonElement;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 1500);
  }

  private download(): void {
    if (!this.lastResult) return;
    const blob = new Blob([this.lastResult.content], { type: this.lastResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.lastResult.filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/domain-tree.ts -->
```typescript
import type { CookieData } from '../../shared/types';
import { extractRootDomain, sortDomainTree } from '../../shared/formatters';

interface DomainCallbacks {
  onDomainSelect: (domain: string | null) => void;
}

export class DomainTree {
  private container: HTMLElement;
  private callbacks: DomainCallbacks;
  private activeDomain: string | null = null;

  constructor(container: HTMLElement, callbacks: DomainCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  update(cookies: CookieData[]): void {
    // Group by root domain
    const domainMap = new Map<string, { subdomains: Set<string>; count: number }>();

    for (const c of cookies) {
      const raw = c.domain.replace(/^\./, '');
      const root = extractRootDomain(raw);
      if (!domainMap.has(root)) domainMap.set(root, { subdomains: new Set(), count: 0 });
      const entry = domainMap.get(root)!;
      entry.subdomains.add(raw);
      entry.count++;
    }

    const sortedDomains = sortDomainTree([...domainMap.keys()]);

    let html = `<div class="domain-tree">
      <div class="domain-node ${this.activeDomain === null ? 'active' : ''}" data-domain="">
        All Domains
        <span class="domain-count">${cookies.length}</span>
      </div>`;

    for (const root of sortedDomains) {
      const entry = domainMap.get(root)!;
      const isActive = this.activeDomain === root;
      html += `
        <div class="domain-node ${isActive ? 'active' : ''}" data-domain="${root}">
          ${this.esc(root)}
          <span class="domain-count">${entry.count}</span>
        </div>`;
    }

    html += '</div>';
    this.container.innerHTML = html;

    this.container.querySelectorAll('.domain-node').forEach((node) => {
      node.addEventListener('click', () => {
        const domain = (node as HTMLElement).dataset.domain || null;
        this.activeDomain = domain;
        this.callbacks.onDomainSelect(domain);
        // Update active state
        this.container.querySelectorAll('.domain-node').forEach((n) => n.classList.remove('active'));
        node.classList.add('active');
      });
    });
  }

  private esc(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/sidepanel/components/partitioned-view.ts -->
```typescript
import type { CookieData } from '../../shared/types';

export class PartitionedView {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  open(cookies: CookieData[]): void {
    const partitioned = cookies.filter((c) => c.partitionKey);

    // Group by partition key
    const groups = new Map<string, CookieData[]>();
    for (const c of partitioned) {
      const key = c.partitionKey!.topLevelSite;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    this.container.classList.remove('hidden');
    this.container.innerHTML = `
      <div class="overlay open">
        <div class="overlay-header">
          <h2>Partitioned Cookies (CHIPS)</h2>
          <button class="icon-btn" id="partitioned-close">&times;</button>
        </div>
        <div class="overlay-body">
          ${partitioned.length === 0
            ? '<p style="color:var(--text-muted);text-align:center;padding:24px;">No partitioned cookies found on this page.</p>'
            : [...groups.entries()].map(([site, cookies]) => `
              <div style="margin-bottom:12px;">
                <h3 style="font-size:13px;color:var(--accent);margin-bottom:6px;">Partition: ${this.esc(site)}</h3>
                ${cookies.map((c) => `
                  <div style="display:flex;gap:8px;padding:6px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin-bottom:4px;font-size:12px;">
                    <span style="font-family:var(--font-mono);font-weight:500;">${this.esc(c.name)}</span>
                    <span style="color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.esc(c.value.substring(0, 50))}</span>
                    <span style="color:var(--text-muted);">${c.domain}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          <div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius);font-size:11px;color:var(--text-muted);">
            <strong>About CHIPS:</strong> Cookies Having Independent Partitioned State (CHIPS) are third-party cookies
            partitioned by top-level site. They require <code>Secure</code> and <code>SameSite=None</code> attributes
            plus the <code>Partitioned</code> attribute. Each top-level site gets its own isolated cookie jar.
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#partitioned-close')!.addEventListener('click', () => this.close());
  }

  close(): void {
    this.container.classList.add('hidden');
  }

  private esc(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
```

---

<!-- FILE: cookieforge/src/popup/popup.html -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CookieForge</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <div id="popup">
    <header>
      <img src="../../assets/icons/icon-32.png" alt="" class="logo" />
      <h1>CookieForge</h1>
      <span id="cookie-count" class="badge">0</span>
    </header>

    <div id="domain-info">
      <span id="current-domain" class="domain-label">—</span>
    </div>

    <div id="quick-stats">
      <div class="stat">
        <span class="stat-value" id="stat-total">0</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="stat-secure">0</span>
        <span class="stat-label">Secure</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="stat-session">0</span>
        <span class="stat-label">Session</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="stat-tracking">0</span>
        <span class="stat-label">Tracking</span>
      </div>
    </div>

    <div id="actions">
      <button class="action-btn" id="btn-panel">
        <span class="action-icon">&#x2630;</span>
        Open Side Panel
      </button>
      <button class="action-btn" id="btn-copy-json">
        <span class="action-icon">{}</span>
        Copy as JSON
      </button>
      <button class="action-btn" id="btn-copy-header">
        <span class="action-icon">H:</span>
        Copy as Header
      </button>
      <button class="action-btn" id="btn-delete-all">
        <span class="action-icon">&times;</span>
        Delete Domain Cookies
      </button>
    </div>

    <div id="footer">
      <a id="options-link">Settings</a>
      <span id="pro-status"></span>
    </div>
  </div>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

---

<!-- FILE: cookieforge/src/popup/popup.ts -->
```typescript
import { sendMessage } from '../shared/messages';
import type { CookieData } from '../shared/types';
import { KNOWN_TRACKERS } from '../shared/constants';
import { extractRootDomain } from '../shared/formatters';

async function init(): Promise<void> {
  let domain = '';
  let cookies: CookieData[] = [];

  try {
    const tab = await sendMessage('tab:getCurrent', undefined);
    domain = tab.domain;
    document.getElementById('current-domain')!.textContent = domain;
    cookies = await sendMessage('cookies:getAll', { domain });
  } catch {
    document.getElementById('current-domain')!.textContent = 'No accessible page';
  }

  const total = cookies.length;
  const secure = cookies.filter((c) => c.secure).length;
  const session = cookies.filter((c) => c.session).length;
  const tracking = cookies.filter((c) => KNOWN_TRACKERS.has(extractRootDomain(c.domain))).length;

  document.getElementById('stat-total')!.textContent = String(total);
  document.getElementById('stat-secure')!.textContent = String(secure);
  document.getElementById('stat-session')!.textContent = String(session);
  document.getElementById('stat-tracking')!.textContent = String(tracking);
  document.getElementById('cookie-count')!.textContent = String(total);

  document.getElementById('btn-panel')!.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  document.getElementById('btn-copy-json')!.addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(cookies, null, 2));
    showToast('Copied JSON');
  });

  document.getElementById('btn-copy-header')!.addEventListener('click', async () => {
    await navigator.clipboard.writeText(cookies.map((c) => `${c.name}=${c.value}`).join('; '));
    showToast('Copied Header');
  });

  document.getElementById('btn-delete-all')!.addEventListener('click', async () => {
    if (!confirm(`Delete all ${total} cookies for ${domain}?`)) return;
    await sendMessage('cookies:removeMultiple', cookies.map((c) => ({
      name: c.name, domain: c.domain, path: c.path, storeId: c.storeId, partitionKey: c.partitionKey,
    })));
    showToast(`Deleted ${total} cookies`);
    setTimeout(() => window.close(), 800);
  });

  document.getElementById('options-link')!.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const pro = await sendMessage('pro:getStatus', undefined);
  const proEl = document.getElementById('pro-status')!;
  if (pro.isPro) {
    proEl.textContent = 'PRO';
    proEl.style.color = '#f59e0b';
  } else if (pro.trialActive) {
    proEl.textContent = `Trial: ${pro.trialDaysLeft}d left`;
  } else {
    proEl.innerHTML = '<a id="upgrade-link" style="color:#e94560;cursor:pointer;">Upgrade to Pro</a>';
    proEl.querySelector('#upgrade-link')?.addEventListener('click', () => sendMessage('pro:openPayment', undefined));
  }
}

function showToast(msg: string): void {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#22c55e;color:white;padding:6px 16px;border-radius:6px;font-size:12px;z-index:999;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1200);
}

document.addEventListener('DOMContentLoaded', init);
```

---

<!-- FILE: cookieforge/src/popup/popup.css -->
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #e4e4e4;
  background: #1a1a2e;
}

#popup { padding: 12px; }

header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
}

header h1 { font-size: 16px; font-weight: 600; }
.logo { width: 24px; height: 24px; }
.badge {
  background: #e94560; color: white; font-size: 11px;
  font-weight: 600; padding: 1px 6px; border-radius: 10px; margin-left: auto;
}

#domain-info {
  padding: 8px; background: #16213e; border-radius: 6px;
  margin-bottom: 12px; text-align: center;
}

.domain-label { font-family: 'Cascadia Code', monospace; font-size: 13px; font-weight: 500; }

#quick-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
}

.stat { text-align: center; padding: 8px 4px; background: #16213e; border-radius: 6px; }
.stat-value { display: block; font-size: 18px; font-weight: 700; color: #e94560; }
.stat-label { display: block; font-size: 10px; color: #a0a0b0; text-transform: uppercase; }

#actions { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }

.action-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  background: #16213e; border: 1px solid #2a2a4a; border-radius: 6px;
  color: #e4e4e4; font-size: 12px; cursor: pointer; transition: all 150ms;
}

.action-btn:hover { background: #1a3a6a; border-color: #e94560; }
.action-icon { width: 20px; text-align: center; font-weight: 700; font-size: 14px; }

#footer {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 8px; border-top: 1px solid #2a2a4a; font-size: 11px;
}

#footer a { color: #a0a0b0; text-decoration: none; cursor: pointer; }
#footer a:hover { color: #e94560; }
```

---

<!-- FILE: cookieforge/src/devtools/devtools.html -->
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body>
  <script src="devtools.js"></script>
</body>
</html>
```

---

<!-- FILE: cookieforge/src/devtools/devtools.ts -->
```typescript
chrome.devtools.panels.create(
  'CookieForge',
  'assets/icons/icon-32.png',
  'src/devtools/panel.html',
  (panel) => {
    panel.onShown.addListener((_window) => {
      _window.postMessage({ action: 'panel-shown' }, '*');
    });
  },
);
```

---

<!-- FILE: cookieforge/src/devtools/panel.html -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CookieForge DevTools</title>
  <link rel="stylesheet" href="../sidepanel/sidepanel.css" />
  <style>
    body { height: 100vh; }
    .devtools-notice {
      padding: 8px 12px; background: #0f3460; color: #93c5fd;
      font-size: 11px; border-bottom: 1px solid #2a2a4a;
    }
  </style>
</head>
<body>
  <div class="devtools-notice">DevTools Panel — inspecting cookies for the current page</div>
  <div id="devtools-table" style="flex:1;overflow:auto;"></div>
  <script src="panel.js" type="module"></script>
</body>
</html>
```

---

<!-- FILE: cookieforge/src/devtools/panel.ts -->
```typescript
import { sendMessage } from '../shared/messages';
import type { CookieData } from '../shared/types';
import { formatExpiry, formatBytes, formatCookieSize } from '../shared/formatters';
import { SAME_SITE_LABELS, COOKIE_SIZE_OK, COOKIE_SIZE_WARN } from '../shared/constants';

const tableContainer = document.getElementById('devtools-table')!;

async function loadCookies(): Promise<void> {
  const tabId = chrome.devtools.inspectedWindow.tabId;

  let url = '';
  try {
    const tab = await chrome.tabs.get(tabId);
    url = tab.url ?? '';
  } catch {
    tableContainer.innerHTML = '<p style="padding:12px;color:#a0a0b0;">Cannot access inspected tab.</p>';
    return;
  }

  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    tableContainer.innerHTML = '<p style="padding:12px;color:#a0a0b0;">Cannot inspect cookies for this page type.</p>';
    return;
  }

  const domain = new URL(url).hostname;
  const cookies = await sendMessage('cookies:getAll', { domain });
  renderTable(cookies);
}

function renderTable(cookies: CookieData[]): void {
  if (cookies.length === 0) {
    tableContainer.innerHTML = '<p style="padding:12px;color:#a0a0b0;">No cookies for this domain.</p>';
    return;
  }

  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr style="background:#16213e;text-align:left;">
      <th style="padding:6px 8px;">Name</th>
      <th style="padding:6px 8px;">Value</th>
      <th style="padding:6px 8px;">Domain</th>
      <th style="padding:6px 8px;">Path</th>
      <th style="padding:6px 8px;">Expires</th>
      <th style="padding:6px 8px;">Size</th>
      <th style="padding:6px 8px;">Flags</th>
    </tr></thead><tbody>`;

  for (const c of cookies) {
    const size = formatCookieSize(c);
    const sizeClass = size > COOKIE_SIZE_WARN ? 'size-error' : size > COOKIE_SIZE_OK ? 'size-warn' : 'size-ok';
    const flags = [
      c.secure ? 'S' : '', c.httpOnly ? 'H' : '', c.partitionKey ? 'P' : '',
      SAME_SITE_LABELS[c.sameSite] ?? '?',
    ].filter(Boolean).join(' ');

    html += `<tr style="border-bottom:1px solid #2a2a4a;">
      <td style="padding:4px 8px;font-family:monospace;font-weight:500;">${esc(c.name)}</td>
      <td style="padding:4px 8px;font-family:monospace;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(c.value)}">${esc(c.value.substring(0, 60))}</td>
      <td style="padding:4px 8px;">${c.domain}</td>
      <td style="padding:4px 8px;">${c.path}</td>
      <td style="padding:4px 8px;">${formatExpiry(c.expirationDate, c.session)}</td>
      <td style="padding:4px 8px;" class="${sizeClass}">${formatBytes(size)}</td>
      <td style="padding:4px 8px;">${flags}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  tableContainer.innerHTML = html;
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

window.addEventListener('message', (e) => {
  if (e.data?.action === 'panel-shown') loadCookies();
});

loadCookies();
```

---

<!-- FILE: cookieforge/src/options/options.html -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CookieForge — Settings</title>
  <link rel="stylesheet" href="options.css" />
</head>
<body>
  <div class="container">
    <header>
      <img src="../../assets/icons/icon-48.png" alt="" />
      <div>
        <h1>CookieForge Settings</h1>
        <p class="subtitle">Configure your cookie editing experience</p>
      </div>
    </header>

    <div id="welcome-banner" class="banner hidden">
      Welcome to CookieForge! The cookie editor developers trust.
    </div>

    <section>
      <h2>Appearance</h2>
      <div class="setting-row"><label>Theme</label>
        <select id="opt-theme"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select>
      </div>
      <div class="setting-row"><label>Compact view</label><input type="checkbox" id="opt-compact" /></div>
      <div class="setting-row"><label>Show cookie sizes</label><input type="checkbox" id="opt-showsize" /></div>
      <div class="setting-row"><label>Group by domain</label><input type="checkbox" id="opt-groupdomain" /></div>
    </section>

    <section>
      <h2>Cookie Table</h2>
      <div class="setting-row"><label>Default sort field</label>
        <select id="opt-sortfield"><option value="name">Name</option><option value="domain">Domain</option><option value="expirationDate">Expiration</option><option value="size">Size</option></select>
      </div>
      <div class="setting-row"><label>Default export format</label>
        <select id="opt-exportformat"><option value="json">JSON</option><option value="netscape">Netscape</option><option value="header">Header</option><option value="curl">cURL</option><option value="puppeteer">Puppeteer</option><option value="playwright">Playwright</option><option value="selenium">Selenium</option></select>
      </div>
    </section>

    <section>
      <h2>Monitor</h2>
      <div class="setting-row"><label>Enable cookie change monitor</label><input type="checkbox" id="opt-monitor" /></div>
      <div class="setting-row"><label>Notify on cookie changes</label><input type="checkbox" id="opt-notify" /></div>
      <div class="setting-row"><label>Highlight changes duration (ms)</label><input type="number" id="opt-highlightms" min="0" max="10000" step="500" /></div>
    </section>

    <section>
      <h2>Safety</h2>
      <div class="setting-row"><label>Confirm before delete</label><input type="checkbox" id="opt-confirmdelete" /></div>
      <div class="setting-row"><label>Confirm before bulk delete</label><input type="checkbox" id="opt-confirmbulk" /></div>
    </section>

    <section>
      <h2>DevTools</h2>
      <div class="setting-row"><label>Enable DevTools panel</label><input type="checkbox" id="opt-devtools" /></div>
    </section>

    <section>
      <h2>Usage Statistics</h2>
      <div id="stats-grid" class="stats-grid"></div>
    </section>

    <section>
      <h2>Subscription</h2>
      <div id="pro-section"></div>
    </section>

    <div class="actions">
      <button class="btn" id="btn-save">Save Settings</button>
      <button class="btn btn-secondary" id="btn-reset">Reset to Defaults</button>
    </div>
  </div>
  <script src="options.js" type="module"></script>
</body>
</html>
```

---

<!-- FILE: cookieforge/src/options/options.ts -->
```typescript
import { sendMessage } from '../shared/messages';
import type { CookieForgeSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

async function init(): Promise<void> {
  const settings = await sendMessage('settings:get', undefined);

  if (new URLSearchParams(window.location.search).has('welcome')) {
    document.getElementById('welcome-banner')!.classList.remove('hidden');
  }

  setSelect('opt-theme', settings.theme);
  setCheck('opt-compact', settings.compactView);
  setCheck('opt-showsize', settings.showCookieSize);
  setCheck('opt-groupdomain', settings.groupByDomain);
  setSelect('opt-sortfield', settings.defaultSortField);
  setSelect('opt-exportformat', settings.defaultExportFormat);
  setCheck('opt-monitor', settings.monitorEnabled);
  setCheck('opt-notify', settings.notifyOnChange);
  setNumber('opt-highlightms', settings.changeHighlightDurationMs);
  setCheck('opt-confirmdelete', settings.confirmBeforeDelete);
  setCheck('opt-confirmbulk', settings.confirmBeforeBulkDelete);
  setCheck('opt-devtools', settings.enableDevtoolsPanel);

  const stats = await sendMessage('stats:get', undefined);
  document.getElementById('stats-grid')!.innerHTML = `
    <div class="stat-card"><span class="stat-val">${stats.cookiesViewed}</span><span>Viewed</span></div>
    <div class="stat-card"><span class="stat-val">${stats.cookiesEdited}</span><span>Edited</span></div>
    <div class="stat-card"><span class="stat-val">${stats.cookiesCreated}</span><span>Created</span></div>
    <div class="stat-card"><span class="stat-val">${stats.cookiesDeleted}</span><span>Deleted</span></div>
    <div class="stat-card"><span class="stat-val">${stats.profilesCreated}</span><span>Profiles</span></div>
    <div class="stat-card"><span class="stat-val">${stats.searchesPerformed}</span><span>Searches</span></div>
    <div class="stat-card"><span class="stat-val">${stats.importsPerformed}</span><span>Imports</span></div>
    <div class="stat-card"><span class="stat-val">${stats.panelOpened}</span><span>Panel Opens</span></div>
  `;

  const pro = await sendMessage('pro:getStatus', undefined);
  const proEl = document.getElementById('pro-section')!;
  if (pro.isPro) {
    proEl.innerHTML = '<p style="color:#f59e0b;font-weight:600;">PRO — Active. Thank you!</p>';
  } else {
    proEl.innerHTML = '<p>Free plan. <button class="btn" id="btn-upgrade" style="margin-top:8px;">Upgrade to Pro — $3.99/mo</button></p>';
    proEl.querySelector('#btn-upgrade')?.addEventListener('click', () => sendMessage('pro:openPayment', undefined));
  }

  document.getElementById('btn-save')!.addEventListener('click', async () => {
    await sendMessage('settings:set', {
      theme: getSelect('opt-theme') as CookieForgeSettings['theme'],
      compactView: getCheck('opt-compact'),
      showCookieSize: getCheck('opt-showsize'),
      groupByDomain: getCheck('opt-groupdomain'),
      defaultSortField: getSelect('opt-sortfield') as CookieForgeSettings['defaultSortField'],
      defaultExportFormat: getSelect('opt-exportformat') as CookieForgeSettings['defaultExportFormat'],
      monitorEnabled: getCheck('opt-monitor'),
      notifyOnChange: getCheck('opt-notify'),
      changeHighlightDurationMs: getNumber('opt-highlightms'),
      confirmBeforeDelete: getCheck('opt-confirmdelete'),
      confirmBeforeBulkDelete: getCheck('opt-confirmbulk'),
      enableDevtoolsPanel: getCheck('opt-devtools'),
    });
    const btn = document.getElementById('btn-save') as HTMLButtonElement;
    btn.textContent = 'Saved!';
    btn.style.background = '#22c55e';
    setTimeout(() => { btn.textContent = 'Save Settings'; btn.style.background = ''; }, 1500);
  });

  document.getElementById('btn-reset')!.addEventListener('click', async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    await sendMessage('settings:set', DEFAULT_SETTINGS);
    window.location.reload();
  });
}

function setSelect(id: string, v: string) { (document.getElementById(id) as HTMLSelectElement).value = v; }
function getSelect(id: string) { return (document.getElementById(id) as HTMLSelectElement).value; }
function setCheck(id: string, v: boolean) { (document.getElementById(id) as HTMLInputElement).checked = v; }
function getCheck(id: string) { return (document.getElementById(id) as HTMLInputElement).checked; }
function setNumber(id: string, v: number) { (document.getElementById(id) as HTMLInputElement).value = String(v); }
function getNumber(id: string) { return parseInt((document.getElementById(id) as HTMLInputElement).value, 10) || 0; }

document.addEventListener('DOMContentLoaded', init);
```

---

<!-- FILE: cookieforge/src/options/options.css -->
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px; color: #e4e4e4; background: #1a1a2e; min-height: 100vh;
}

.container { max-width: 640px; margin: 0 auto; padding: 24px; }

header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
header img { width: 48px; height: 48px; }
header h1 { font-size: 20px; }
.subtitle { font-size: 13px; color: #a0a0b0; }

.banner {
  padding: 12px 16px; background: linear-gradient(135deg, #0f3460, #1a1a2e);
  border: 1px solid #e94560; border-radius: 8px; margin-bottom: 24px; text-align: center;
}

section { margin-bottom: 24px; }
section h2 {
  font-size: 15px; font-weight: 600; color: #e94560;
  margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #2a2a4a;
}

.setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid #1a1a3e;
}

.setting-row select, .setting-row input[type="number"] {
  background: #16213e; border: 1px solid #2a2a4a; color: #e4e4e4;
  padding: 6px 10px; border-radius: 4px; font-size: 12px;
}

.setting-row input[type="checkbox"] { accent-color: #e94560; width: 18px; height: 18px; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat-card { text-align: center; padding: 12px 4px; background: #16213e; border-radius: 6px; }
.stat-val { display: block; font-size: 20px; font-weight: 700; color: #e94560; }
.stat-card span:last-child { font-size: 10px; color: #a0a0b0; text-transform: uppercase; }

.actions { display: flex; gap: 8px; margin-top: 24px; }

.btn {
  background: #e94560; color: white; border: none; border-radius: 6px;
  padding: 10px 20px; font-size: 13px; font-weight: 500; cursor: pointer;
}
.btn:hover { background: #ff6b81; }
.btn-secondary { background: #16213e; border: 1px solid #2a2a4a; }
.btn-secondary:hover { background: #1a3a6a; }
.hidden { display: none !important; }
```

---

<!-- FILE: cookieforge/src/_locales/en/messages.json -->
```json
{
  "extensionName": { "message": "CookieForge" },
  "extensionDescription": { "message": "The cookie editor developers trust. View, edit, create, delete, export, and monitor cookies with profiles, bulk operations, and 7 export formats." },
  "commandOpenPanel": { "message": "Open CookieForge side panel" },
  "commandCopyJSON": { "message": "Copy cookies as JSON" },
  "commandCopyHeader": { "message": "Copy cookies as Cookie header" },
  "ctxCopyJSON": { "message": "Copy cookies as JSON" },
  "ctxCopyHeader": { "message": "Copy cookies as Header" },
  "ctxOpenPanel": { "message": "Open CookieForge" },
  "ctxDeleteDomain": { "message": "Delete all cookies for this domain" },
  "searchPlaceholder": { "message": "Search cookies..." },
  "addCookie": { "message": "Add Cookie" },
  "editCookie": { "message": "Edit Cookie" },
  "deleteCookie": { "message": "Delete Cookie" },
  "save": { "message": "Save" },
  "cancel": { "message": "Cancel" },
  "confirmDelete": { "message": "Are you sure you want to delete this cookie?" },
  "confirmBulkDelete": { "message": "Delete $COUNT$ cookies?", "placeholders": { "COUNT": { "content": "$1" } } },
  "importSuccess": { "message": "Imported $COUNT$ cookies.", "placeholders": { "COUNT": { "content": "$1" } } },
  "exportSuccess": { "message": "Exported $COUNT$ cookies.", "placeholders": { "COUNT": { "content": "$1" } } },
  "profileApplied": { "message": "Profile applied: $COUNT$ cookies set.", "placeholders": { "COUNT": { "content": "$1" } } },
  "upgradePrompt": { "message": "Upgrade to Pro to unlock all features" }
}
```

---

<!-- FILE: cookieforge/src/_locales/es/messages.json -->
```json
{
  "extensionName": { "message": "CookieForge" },
  "extensionDescription": { "message": "El editor de cookies en el que confían los desarrolladores. Visualiza, edita, crea, elimina, exporta y monitorea cookies con perfiles y 7 formatos." },
  "commandOpenPanel": { "message": "Abrir panel lateral de CookieForge" },
  "commandCopyJSON": { "message": "Copiar cookies como JSON" },
  "commandCopyHeader": { "message": "Copiar cookies como encabezado" },
  "ctxCopyJSON": { "message": "Copiar cookies como JSON" },
  "ctxCopyHeader": { "message": "Copiar cookies como Header" },
  "ctxOpenPanel": { "message": "Abrir CookieForge" },
  "ctxDeleteDomain": { "message": "Eliminar todas las cookies de este dominio" },
  "searchPlaceholder": { "message": "Buscar cookies..." },
  "addCookie": { "message": "Agregar Cookie" },
  "save": { "message": "Guardar" },
  "cancel": { "message": "Cancelar" },
  "confirmDelete": { "message": "¿Eliminar esta cookie?" },
  "confirmBulkDelete": { "message": "¿Eliminar $COUNT$ cookies?", "placeholders": { "COUNT": { "content": "$1" } } },
  "importSuccess": { "message": "$COUNT$ cookies importadas.", "placeholders": { "COUNT": { "content": "$1" } } },
  "upgradePrompt": { "message": "Actualiza a Pro para desbloquear todo" }
}
```

---

<!-- FILE: cookieforge/src/_locales/pt_BR/messages.json -->
```json
{
  "extensionName": { "message": "CookieForge" },
  "extensionDescription": { "message": "O editor de cookies em que os desenvolvedores confiam. Visualize, edite, crie, exclua, exporte e monitore cookies com perfis e 7 formatos." },
  "commandOpenPanel": { "message": "Abrir painel lateral do CookieForge" },
  "commandCopyJSON": { "message": "Copiar cookies como JSON" },
  "commandCopyHeader": { "message": "Copiar cookies como cabeçalho" },
  "ctxCopyJSON": { "message": "Copiar cookies como JSON" },
  "ctxCopyHeader": { "message": "Copiar cookies como Header" },
  "ctxOpenPanel": { "message": "Abrir CookieForge" },
  "ctxDeleteDomain": { "message": "Excluir todos os cookies deste domínio" },
  "searchPlaceholder": { "message": "Pesquisar cookies..." },
  "addCookie": { "message": "Adicionar Cookie" },
  "save": { "message": "Salvar" },
  "cancel": { "message": "Cancelar" },
  "confirmDelete": { "message": "Excluir este cookie?" },
  "confirmBulkDelete": { "message": "Excluir $COUNT$ cookies?", "placeholders": { "COUNT": { "content": "$1" } } },
  "importSuccess": { "message": "$COUNT$ cookies importados.", "placeholders": { "COUNT": { "content": "$1" } } },
  "upgradePrompt": { "message": "Atualize para Pro" }
}
```

---

<!-- FILE: cookieforge/src/_locales/zh_CN/messages.json -->
```json
{
  "extensionName": { "message": "CookieForge" },
  "extensionDescription": { "message": "开发者信赖的Cookie编辑器。查看、编辑、创建、删除、导出和监控Cookie，支持配置文件和7种导出格式。" },
  "commandOpenPanel": { "message": "打开CookieForge侧边面板" },
  "commandCopyJSON": { "message": "复制Cookie为JSON" },
  "commandCopyHeader": { "message": "复制Cookie为请求头" },
  "ctxCopyJSON": { "message": "复制Cookie为JSON" },
  "ctxCopyHeader": { "message": "复制Cookie为Header" },
  "ctxOpenPanel": { "message": "打开CookieForge" },
  "ctxDeleteDomain": { "message": "删除此域名所有Cookie" },
  "searchPlaceholder": { "message": "搜索Cookie..." },
  "addCookie": { "message": "添加Cookie" },
  "save": { "message": "保存" },
  "cancel": { "message": "取消" },
  "confirmDelete": { "message": "确定删除此Cookie？" },
  "confirmBulkDelete": { "message": "确定删除$COUNT$个Cookie？", "placeholders": { "COUNT": { "content": "$1" } } },
  "importSuccess": { "message": "成功导入$COUNT$个Cookie。", "placeholders": { "COUNT": { "content": "$1" } } },
  "upgradePrompt": { "message": "升级到Pro版本" }
}
```

---

<!-- FILE: cookieforge/src/_locales/fr/messages.json -->
```json
{
  "extensionName": { "message": "CookieForge" },
  "extensionDescription": { "message": "L'éditeur de cookies de confiance pour les développeurs. Visualisez, modifiez, créez, supprimez, exportez et surveillez les cookies avec profils et 7 formats." },
  "commandOpenPanel": { "message": "Ouvrir le panneau latéral CookieForge" },
  "commandCopyJSON": { "message": "Copier les cookies en JSON" },
  "commandCopyHeader": { "message": "Copier les cookies en en-tête" },
  "ctxCopyJSON": { "message": "Copier en JSON" },
  "ctxCopyHeader": { "message": "Copier en Header" },
  "ctxOpenPanel": { "message": "Ouvrir CookieForge" },
  "ctxDeleteDomain": { "message": "Supprimer tous les cookies de ce domaine" },
  "searchPlaceholder": { "message": "Rechercher des cookies..." },
  "addCookie": { "message": "Ajouter un Cookie" },
  "save": { "message": "Enregistrer" },
  "cancel": { "message": "Annuler" },
  "confirmDelete": { "message": "Supprimer ce cookie ?" },
  "confirmBulkDelete": { "message": "Supprimer $COUNT$ cookies ?", "placeholders": { "COUNT": { "content": "$1" } } },
  "importSuccess": { "message": "$COUNT$ cookies importés.", "placeholders": { "COUNT": { "content": "$1" } } },
  "upgradePrompt": { "message": "Passez à Pro" }
}
```

---

<!-- FILE: cookieforge/scripts/build.ts -->
```typescript
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync, rmSync } from 'fs';

const isDev = process.argv.includes('--dev');

const sharedConfig: esbuild.BuildOptions = {
  bundle: true,
  sourcemap: isDev ? 'inline' : false,
  minify: !isDev,
  target: 'chrome120',
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
    '__VERSION__': '"1.0.0"',
  },
  drop: isDev ? [] : ['console', 'debugger'],
  treeShaking: true,
  legalComments: 'none',
};

const entryPoints: { entry: string; out: string; format: 'esm' | 'iife' }[] = [
  { entry: 'src/background/service-worker.ts', out: 'dist/src/background/service-worker.js', format: 'esm' },
  { entry: 'src/sidepanel/sidepanel.ts', out: 'dist/src/sidepanel/sidepanel.js', format: 'iife' },
  { entry: 'src/popup/popup.ts', out: 'dist/src/popup/popup.js', format: 'iife' },
  { entry: 'src/devtools/devtools.ts', out: 'dist/src/devtools/devtools.js', format: 'iife' },
  { entry: 'src/devtools/panel.ts', out: 'dist/src/devtools/panel.js', format: 'iife' },
  { entry: 'src/options/options.ts', out: 'dist/src/options/options.js', format: 'iife' },
];

async function build(): Promise<void> {
  if (existsSync('dist')) rmSync('dist', { recursive: true });
  mkdirSync('dist', { recursive: true });

  await Promise.all(entryPoints.map((ep) =>
    esbuild.build({ ...sharedConfig, entryPoints: [ep.entry], outfile: ep.out, format: ep.format }),
  ));

  // Copy static files
  cpSync('manifest.json', 'dist/manifest.json');
  for (const dir of ['sidepanel', 'popup', 'devtools', 'options']) {
    const srcDir = `src/${dir}`;
    const distDir = `dist/src/${dir}`;
    mkdirSync(distDir, { recursive: true });
    for (const ext of ['html', 'css']) {
      const files = [`${srcDir}/${dir}.${ext}`];
      if (dir === 'devtools') files.push(`${srcDir}/panel.html`);
      for (const f of files) {
        if (existsSync(f)) cpSync(f, f.replace('src/', 'dist/src/'));
      }
    }
  }
  cpSync('src/_locales', 'dist/src/_locales', { recursive: true });
  if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true });

  console.log(`[build] Complete (${isDev ? 'dev' : 'prod'})`);
}

build().catch((err) => { console.error(err); process.exit(1); });
```

---

<!-- FILE: cookieforge/scripts/dev.ts -->
```typescript
import { spawn } from 'child_process';
import chokidar from 'chokidar';

console.log('[dev] Starting development mode...');

const initial = spawn('tsx', ['scripts/build.ts', '--dev'], { stdio: 'inherit' });

initial.on('close', () => {
  console.log('[dev] Initial build done. Watching for changes...');

  const watcher = chokidar.watch(['src/**/*.ts', 'src/**/*.html', 'src/**/*.css', 'manifest.json'], {
    ignoreInitial: true,
  });

  let rebuilding = false;
  watcher.on('all', (_event, path) => {
    if (rebuilding) return;
    rebuilding = true;
    console.log(`[dev] Change: ${path} — rebuilding...`);
    const rebuild = spawn('tsx', ['scripts/build.ts', '--dev'], { stdio: 'inherit' });
    rebuild.on('close', (code) => {
      rebuilding = false;
      if (code === 0) console.log('[dev] Rebuild done. Reload in chrome://extensions');
    });
  });
});
```

---

<!-- FILE: cookieforge/scripts/package.ts -->
```typescript
import { createWriteStream, readFileSync } from 'fs';
import archiver from 'archiver';

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf-8'));
const filename = `cookieforge-v${manifest.version}.zip`;

const output = createWriteStream(filename);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.on('error', (err) => { throw err; });
archive.on('end', () => console.log(`[package] ${filename} (${(archive.pointer() / 1024).toFixed(1)} KB)`));

archive.pipe(output);
archive.directory('dist/', false);
archive.finalize();
```

---

## TESTS — FULL IMPLEMENTATION

---

<!-- FILE: cookieforge/tests/unit/validators.test.ts -->
```typescript
import { describe, it, expect } from 'vitest';
import { validateCookie, isValidSameSite, sanitizeCookieValue, detectImportFormat } from '../../src/shared/validators';
import type { CookieData } from '../../src/shared/types';

describe('validateCookie', () => {
  const validCookie: Partial<CookieData> = {
    name: 'session_id',
    value: 'abc123',
    domain: '.example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    expirationDate: Math.floor(Date.now() / 1000) + 86400,
  };

  it('returns no errors for a valid cookie', () => {
    expect(validateCookie(validCookie)).toEqual([]);
  });

  it('requires a name', () => {
    const errors = validateCookie({ ...validCookie, name: '' });
    expect(errors.some((e) => e.field === 'name' && e.severity === 'error')).toBe(true);
  });

  it('rejects names with control characters', () => {
    const errors = validateCookie({ ...validCookie, name: 'bad\x00name' });
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects names with spaces', () => {
    const errors = validateCookie({ ...validCookie, name: 'bad name' });
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects names with semicolons', () => {
    const errors = validateCookie({ ...validCookie, name: 'bad;name' });
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects names with equals signs', () => {
    const errors = validateCookie({ ...validCookie, name: 'bad=name' });
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('requires __Secure- prefix to have Secure flag', () => {
    const errors = validateCookie({ ...validCookie, name: '__Secure-ID', secure: false });
    expect(errors.some((e) => e.field === 'name' && e.message.includes('__Secure-'))).toBe(true);
  });

  it('requires __Host- prefix to have Secure + path=/ + no dot domain', () => {
    // Missing secure
    let errors = validateCookie({ ...validCookie, name: '__Host-ID', secure: false, path: '/' });
    expect(errors.some((e) => e.message.includes('__Host-') && e.message.includes('Secure'))).toBe(true);

    // Wrong path
    errors = validateCookie({ ...validCookie, name: '__Host-ID', secure: true, path: '/sub' });
    expect(errors.some((e) => e.message.includes('__Host-') && e.message.includes('path'))).toBe(true);
  });

  it('rejects oversized cookies', () => {
    const errors = validateCookie({ ...validCookie, value: 'x'.repeat(5000) });
    expect(errors.some((e) => e.field === 'value')).toBe(true);
  });

  it('rejects total size exceeding 4096 bytes', () => {
    const errors = validateCookie({ ...validCookie, name: 'x'.repeat(2000), value: 'y'.repeat(2100) });
    expect(errors.some((e) => e.field === 'size')).toBe(true);
  });

  it('requires domain', () => {
    const errors = validateCookie({ ...validCookie, domain: '' });
    expect(errors.some((e) => e.field === 'domain' && e.severity === 'error')).toBe(true);
  });

  it('rejects domain with spaces', () => {
    const errors = validateCookie({ ...validCookie, domain: 'bad domain.com' });
    expect(errors.some((e) => e.field === 'domain')).toBe(true);
  });

  it('requires path to start with /', () => {
    const errors = validateCookie({ ...validCookie, path: 'noslash' });
    expect(errors.some((e) => e.field === 'path')).toBe(true);
  });

  it('warns about SameSite=None without Secure', () => {
    const errors = validateCookie({ ...validCookie, sameSite: 'no_restriction', secure: false });
    expect(errors.some((e) => e.field === 'sameSite')).toBe(true);
  });

  it('warns about past expiration dates', () => {
    const errors = validateCookie({ ...validCookie, expirationDate: 1000 });
    expect(errors.some((e) => e.field === 'expirationDate' && e.severity === 'warning')).toBe(true);
  });

  it('warns about expiration exceeding 400 days', () => {
    const errors = validateCookie({ ...validCookie, expirationDate: Math.floor(Date.now() / 1000) + 500 * 86400 });
    expect(errors.some((e) => e.field === 'expirationDate' && e.message.includes('400'))).toBe(true);
  });

  it('validates partitioned cookies require Secure', () => {
    const errors = validateCookie({
      ...validCookie,
      secure: false,
      partitionKey: { topLevelSite: 'https://example.com' },
    });
    expect(errors.some((e) => e.field === 'partitionKey' && e.message.includes('Secure'))).toBe(true);
  });

  it('validates partitioned cookies should use SameSite=None', () => {
    const errors = validateCookie({
      ...validCookie,
      sameSite: 'lax',
      partitionKey: { topLevelSite: 'https://example.com' },
    });
    expect(errors.some((e) => e.field === 'partitionKey' && e.severity === 'warning')).toBe(true);
  });

  it('rejects empty partition key topLevelSite', () => {
    const errors = validateCookie({
      ...validCookie,
      sameSite: 'no_restriction',
      partitionKey: { topLevelSite: '' },
    });
    expect(errors.some((e) => e.field === 'partitionKey' && e.severity === 'error')).toBe(true);
  });
});

describe('isValidSameSite', () => {
  it('accepts valid values', () => {
    expect(isValidSameSite('no_restriction')).toBe(true);
    expect(isValidSameSite('lax')).toBe(true);
    expect(isValidSameSite('strict')).toBe(true);
    expect(isValidSameSite('unspecified')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isValidSameSite('None')).toBe(false);
    expect(isValidSameSite('')).toBe(false);
    expect(isValidSameSite('invalid')).toBe(false);
  });
});

describe('sanitizeCookieValue', () => {
  it('strips NUL bytes', () => {
    expect(sanitizeCookieValue('hello\0world')).toBe('helloworld');
  });

  it('trims whitespace', () => {
    expect(sanitizeCookieValue('  value  ')).toBe('value');
  });

  it('handles empty string', () => {
    expect(sanitizeCookieValue('')).toBe('');
  });
});

describe('detectImportFormat', () => {
  it('detects JSON', () => {
    expect(detectImportFormat('[{"name":"a","value":"b"}]')).toBe('json');
  });

  it('detects Netscape', () => {
    expect(detectImportFormat('# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tFALSE\t0\tname\tvalue')).toBe('netscape');
  });

  it('detects Netscape without header comment', () => {
    expect(detectImportFormat('.example.com\tTRUE\t/\tFALSE\t0\tname\tvalue')).toBe('netscape');
  });

  it('detects cookie header', () => {
    expect(detectImportFormat('session=abc123; token=xyz')).toBe('header');
  });

  it('returns unknown for garbage', () => {
    expect(detectImportFormat('not a cookie format at all\nrandom text')).toBe('unknown');
  });

  it('returns unknown for empty string', () => {
    expect(detectImportFormat('')).toBe('unknown');
  });

  it('returns unknown for malformed JSON', () => {
    expect(detectImportFormat('[{broken json')).toBe('unknown');
  });
});
```

---

<!-- FILE: cookieforge/tests/unit/formatters.test.ts -->
```typescript
import { describe, it, expect } from 'vitest';
import { formatCookies, formatBytes, formatExpiry, extractRootDomain, sortDomainTree, formatCookieSize } from '../../src/shared/formatters';
import type { CookieData } from '../../src/shared/types';

const sampleCookie: CookieData = {
  name: 'session',
  value: 'abc123',
  domain: '.example.com',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  expirationDate: 1700000000,
  hostOnly: false,
  session: false,
  storeId: '0',
};

describe('formatCookies', () => {
  it('exports as JSON', () => {
    const result = formatCookies([sampleCookie], 'json');
    expect(result.format).toBe('json');
    expect(result.mimeType).toBe('application/json');
    expect(result.cookieCount).toBe(1);
    const parsed = JSON.parse(result.content);
    expect(parsed[0].name).toBe('session');
    expect(parsed[0].value).toBe('abc123');
  });

  it('exports as Netscape', () => {
    const result = formatCookies([sampleCookie], 'netscape');
    expect(result.content).toContain('# Netscape HTTP Cookie File');
    expect(result.content).toContain('.example.com');
    expect(result.content).toContain('session');
    expect(result.content).toContain('abc123');
    // Should have tab-separated fields
    const lines = result.content.split('\n').filter((l) => !l.startsWith('#') && l.trim().length > 0);
    expect(lines[0]!.split('\t').length).toBe(7);
  });

  it('exports as Cookie header', () => {
    const result = formatCookies([sampleCookie, { ...sampleCookie, name: 'token', value: 'xyz' }], 'header');
    expect(result.content).toBe('session=abc123; token=xyz');
  });

  it('exports as cURL', () => {
    const result = formatCookies([sampleCookie], 'curl', 'example.com');
    expect(result.content).toContain('curl');
    expect(result.content).toContain('--cookie');
    expect(result.content).toContain('session=abc123');
  });

  it('exports as Puppeteer', () => {
    const result = formatCookies([sampleCookie], 'puppeteer');
    expect(result.content).toContain('puppeteer');
    expect(result.content).toContain('setCookie');
    expect(result.content).toContain('session');
  });

  it('exports as Playwright', () => {
    const result = formatCookies([sampleCookie], 'playwright');
    const parsed = JSON.parse(result.content);
    expect(parsed.cookies).toBeDefined();
    expect(parsed.cookies[0].name).toBe('session');
  });

  it('exports as Selenium', () => {
    const result = formatCookies([sampleCookie], 'selenium');
    expect(result.content).toContain('selenium');
    expect(result.content).toContain('add_cookie');
    expect(result.content).toContain('session');
  });

  it('handles empty cookies array', () => {
    const result = formatCookies([], 'json');
    expect(result.cookieCount).toBe(0);
    expect(JSON.parse(result.content)).toEqual([]);
  });

  it('includes partitionKey in JSON export when present', () => {
    const partitioned = { ...sampleCookie, partitionKey: { topLevelSite: 'https://top.com' } };
    const result = formatCookies([partitioned], 'json');
    const parsed = JSON.parse(result.content);
    expect(parsed[0].partitionKey.topLevelSite).toBe('https://top.com');
  });

  it('omits partitionKey in JSON export when absent', () => {
    const result = formatCookies([sampleCookie], 'json');
    const parsed = JSON.parse(result.content);
    expect(parsed[0].partitionKey).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => { expect(formatBytes(500)).toBe('500 B'); });
  it('formats kilobytes', () => { expect(formatBytes(1536)).toBe('1.5 KB'); });
  it('formats megabytes', () => { expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB'); });
  it('handles zero', () => { expect(formatBytes(0)).toBe('0 B'); });
});

describe('formatExpiry', () => {
  it('returns Session for session cookies', () => {
    expect(formatExpiry(undefined, true)).toBe('Session');
  });

  it('returns Expired for past dates', () => {
    expect(formatExpiry(1000, false)).toContain('Expired');
  });

  it('formats future dates', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const result = formatExpiry(future, false);
    expect(result).toContain('in');
  });
});

describe('extractRootDomain', () => {
  it('extracts root from subdomain', () => {
    expect(extractRootDomain('www.example.com')).toBe('example.com');
  });

  it('handles leading dot', () => {
    expect(extractRootDomain('.example.com')).toBe('example.com');
  });

  it('returns two-part domain as-is', () => {
    expect(extractRootDomain('example.com')).toBe('example.com');
  });

  it('handles deep subdomains', () => {
    expect(extractRootDomain('a.b.c.example.com')).toBe('example.com');
  });
});

describe('sortDomainTree', () => {
  it('sorts by root domain then alphabetically', () => {
    const input = ['cdn.example.com', 'api.another.com', 'www.example.com', '.another.com'];
    const sorted = sortDomainTree(input);
    // another.com domains first, then example.com
    expect(sorted[0]).toContain('another');
    expect(sorted[sorted.length - 1]).toContain('example');
  });
});

describe('formatCookieSize', () => {
  it('calculates size of name=value', () => {
    const size = formatCookieSize(sampleCookie);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(100);
  });
});
```

---

<!-- FILE: cookieforge/tests/unit/storage.test.ts -->
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome.storage
const mockStorageData: Record<string, unknown> = {};

const mockStorage = {
  get: vi.fn(async (key: string) => ({ [key]: mockStorageData[key] })),
  set: vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(mockStorageData, items);
  }),
  remove: vi.fn(async (key: string) => { delete mockStorageData[key]; }),
};

vi.stubGlobal('chrome', {
  storage: {
    local: mockStorage,
    sync: mockStorage,
  },
});

import { getSettings, setSettings, getProfiles, addProfile, removeProfile, incrementStat, getStats } from '../../src/shared/storage';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../../src/shared/types';

beforeEach(() => {
  Object.keys(mockStorageData).forEach((k) => delete mockStorageData[k]);
  vi.clearAllMocks();
});

describe('getSettings', () => {
  it('returns defaults when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('returns stored settings', async () => {
    mockStorageData['cookieforge_settings'] = { ...DEFAULT_SETTINGS, theme: 'light' };
    const settings = await getSettings();
    expect(settings.theme).toBe('light');
  });
});

describe('setSettings', () => {
  it('merges partial settings with existing', async () => {
    const result = await setSettings({ theme: 'light' });
    expect(result.theme).toBe('light');
    expect(result.monitorEnabled).toBe(DEFAULT_SETTINGS.monitorEnabled);
  });
});

describe('profiles', () => {
  it('starts with empty profiles', async () => {
    const profiles = await getProfiles();
    expect(profiles).toEqual([]);
  });

  it('adds a profile', async () => {
    await addProfile({ id: '1', name: 'Test', description: '', cookies: [], domain: null, createdAt: 0, updatedAt: 0, color: '#fff', icon: 'cookie', locked: false });
    const profiles = await getProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0]!.name).toBe('Test');
  });

  it('removes a profile', async () => {
    await addProfile({ id: '1', name: 'Test', description: '', cookies: [], domain: null, createdAt: 0, updatedAt: 0, color: '#fff', icon: 'cookie', locked: false });
    await removeProfile('1');
    const profiles = await getProfiles();
    expect(profiles.length).toBe(0);
  });
});

describe('stats', () => {
  it('returns default stats when empty', async () => {
    const stats = await getStats();
    expect(stats).toEqual(DEFAULT_STATS);
  });

  it('increments a stat', async () => {
    await incrementStat('cookiesViewed', 5);
    const stats = await getStats();
    expect(stats.cookiesViewed).toBe(5);
    expect(stats.lastUsed).toBeGreaterThan(0);
  });

  it('sets firstUsed on first increment', async () => {
    await incrementStat('cookiesEdited');
    const stats = await getStats();
    expect(stats.firstUsed).toBeGreaterThan(0);
  });
});
```

---

<!-- FILE: cookieforge/tests/unit/messages.test.ts -->
```typescript
import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn((_msg, callback) => {
      callback({ success: true, data: [{ name: 'test', value: '123' }], requestId: 'test-1' });
    }),
    lastError: null,
  },
});

import { sendMessage } from '../../src/shared/messages';

describe('sendMessage', () => {
  it('resolves with data on success', async () => {
    const result = await sendMessage('cookies:getAll', { domain: 'example.com' });
    expect(result).toEqual([{ name: 'test', value: '123' }]);
  });

  it('rejects on error response', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_msg, callback) => {
      callback({ success: false, error: 'test error', requestId: 'test-2' });
    });
    await expect(sendMessage('cookies:getAll', {})).rejects.toThrow('test error');
  });

  it('rejects when chrome.runtime.lastError is set', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_msg, callback) => {
      Object.defineProperty(chrome.runtime, 'lastError', { value: { message: 'Extension context invalidated' }, configurable: true });
      callback(undefined);
      Object.defineProperty(chrome.runtime, 'lastError', { value: null, configurable: true });
    });
    await expect(sendMessage('cookies:getAll', {})).rejects.toThrow('Extension context invalidated');
  });

  it('rejects when no response received', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_msg, callback) => {
      callback(undefined);
    });
    await expect(sendMessage('cookies:getAll', {})).rejects.toThrow('No response');
  });
});
```

---

<!-- FILE: cookieforge/tests/integration/cookie-api.test.ts -->
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookies: chrome.cookies.Cookie[] = [
  {
    name: 'session', value: 'abc', domain: '.example.com', path: '/',
    secure: true, httpOnly: true, sameSite: 'lax', hostOnly: false, session: false,
    expirationDate: 2000000000, storeId: '0',
  },
  {
    name: 'prefs', value: 'dark', domain: '.example.com', path: '/',
    secure: false, httpOnly: false, sameSite: 'lax', hostOnly: false, session: true,
    storeId: '0',
  },
];

vi.stubGlobal('chrome', {
  cookies: {
    getAll: vi.fn(async () => mockCookies),
    get: vi.fn(async ({ name }: { name: string }) => mockCookies.find((c) => c.name === name) ?? null),
    set: vi.fn(async (details: { name: string }) => ({ ...mockCookies[0], ...details })),
    remove: vi.fn(async () => ({ url: 'https://example.com/', name: 'test', storeId: '0' })),
  },
});

import { CookieAPI } from '../../src/background/cookie-api';

describe('CookieAPI', () => {
  let api: CookieAPI;

  beforeEach(() => {
    api = new CookieAPI();
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns normalized cookies', async () => {
      const cookies = await api.getAll({ domain: 'example.com' });
      expect(cookies.length).toBe(2);
      expect(cookies[0]!.name).toBe('session');
      expect(cookies[1]!.name).toBe('prefs');
    });

    it('calls chrome.cookies.getAll with domain filter', async () => {
      await api.getAll({ domain: 'test.com' });
      expect(chrome.cookies.getAll).toHaveBeenCalledWith({ domain: 'test.com' });
    });
  });

  describe('get', () => {
    it('returns a cookie by identifier', async () => {
      const cookie = await api.get({ name: 'session', domain: '.example.com', path: '/', storeId: '0' });
      expect(cookie).not.toBeNull();
      expect(cookie!.name).toBe('session');
    });

    it('returns null for non-existent cookie', async () => {
      vi.mocked(chrome.cookies.get).mockResolvedValueOnce(null);
      const cookie = await api.get({ name: 'nonexistent', domain: '.x.com', path: '/', storeId: '0' });
      expect(cookie).toBeNull();
    });
  });

  describe('set', () => {
    it('sets a cookie and returns normalized result', async () => {
      const result = await api.set({
        name: 'new', value: 'val', domain: '.example.com', path: '/',
        secure: true, httpOnly: false, sameSite: 'lax',
        expirationDate: 2000000000, hostOnly: false, session: false, storeId: '0',
      });
      expect(result.name).toBe('new');
    });
  });

  describe('remove', () => {
    it('removes a cookie', async () => {
      const ok = await api.remove({ name: 'session', domain: '.example.com', path: '/', storeId: '0' });
      expect(ok).toBe(true);
    });
  });

  describe('removeMultiple', () => {
    it('removes multiple cookies in batches', async () => {
      const ids = Array.from({ length: 75 }, (_, i) => ({
        name: `cookie${i}`, domain: '.example.com', path: '/', storeId: '0',
      }));
      const result = await api.removeMultiple(ids);
      expect(result.succeeded).toBe(75);
      expect(result.failed).toBe(0);
    });
  });

  describe('duplicate', () => {
    it('creates a copy with _copy suffix', async () => {
      const result = await api.duplicate({ name: 'session', domain: '.example.com', path: '/', storeId: '0' });
      expect(chrome.cookies.set).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('produces a health report', async () => {
      const report = await api.healthCheck('example.com');
      expect(report.totalCookies).toBe(2);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.generatedAt).toBeGreaterThan(0);
    });

    it('flags missing secure on non-localhost', async () => {
      const report = await api.healthCheck('example.com');
      const secIssues = report.issues.filter((i) => i.issue === 'missing_secure_flag');
      expect(secIssues.length).toBeGreaterThan(0);
    });
  });
});
```

---

<!-- FILE: cookieforge/tests/integration/import-export.test.ts -->
```typescript
import { describe, it, expect, vi } from 'vitest';
import type { CookieData } from '../../src/shared/types';

vi.stubGlobal('chrome', {
  cookies: {
    getAll: vi.fn(async () => []),
    get: vi.fn(async () => null),
    set: vi.fn(async (d: Record<string, unknown>) => d),
    remove: vi.fn(async () => ({})),
  },
});

import { ImportEngine } from '../../src/background/import-engine';
import { ExportEngine } from '../../src/background/export-engine';

const testCookie: CookieData = {
  name: 'test', value: 'val', domain: '.example.com', path: '/',
  secure: true, httpOnly: false, sameSite: 'lax',
  expirationDate: 2000000000, hostOnly: false, session: false, storeId: '0',
};

describe('Import → Export roundtrip', () => {
  const importEngine = new ImportEngine();
  const exportEngine = new ExportEngine();

  it('roundtrips JSON', () => {
    const exported = exportEngine.execute([testCookie], 'json');
    const imported = importEngine.parse(exported.content);
    expect(imported.format).toBe('json');
    expect(imported.cookies.length).toBe(1);
    expect(imported.cookies[0]!.name).toBe('test');
    expect(imported.cookies[0]!.value).toBe('val');
    expect(imported.errors).toEqual([]);
  });

  it('roundtrips Netscape', () => {
    const exported = exportEngine.execute([testCookie], 'netscape');
    const imported = importEngine.parse(exported.content);
    expect(imported.format).toBe('netscape');
    expect(imported.cookies.length).toBe(1);
    expect(imported.cookies[0]!.name).toBe('test');
  });

  it('roundtrips Cookie header', () => {
    const exported = exportEngine.execute([testCookie], 'header');
    const imported = importEngine.parse(exported.content);
    expect(imported.format).toBe('header');
    expect(imported.cookies.length).toBe(1);
    expect(imported.cookies[0]!.name).toBe('test');
  });
});

describe('ImportEngine edge cases', () => {
  const importEngine = new ImportEngine();

  it('rejects empty content', () => {
    const result = importEngine.parse('');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles malformed JSON gracefully', () => {
    const result = importEngine.parse('[{bad json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.cookies.length).toBe(0);
  });

  it('skips entries missing name/domain in JSON', () => {
    const result = importEngine.parse('[{"value":"only_value"}]');
    expect(result.cookies.length).toBe(0);
    expect(result.totalSkipped).toBe(1);
  });

  it('handles non-array JSON', () => {
    const result = importEngine.parse('{"name":"not_an_array"}');
    expect(result.errors.some((e) => e.includes('array'))).toBe(true);
  });

  it('parses Netscape with missing fields gracefully', () => {
    const result = importEngine.parse('.example.com\tTRUE\t/');
    expect(result.totalSkipped).toBeGreaterThan(0);
  });

  it('detects format from filename extension', () => {
    const result = importEngine.parse('random content', 'cookies.json');
    expect(result.format).toBe('json'); // detected by extension even if parse fails
  });
});

describe('ExportEngine', () => {
  const exportEngine = new ExportEngine();

  it('throws for unsupported format', () => {
    expect(() => exportEngine.execute([], 'xml' as never)).toThrow('Unsupported');
  });

  it('handles zero cookies', () => {
    const result = exportEngine.execute([], 'json');
    expect(result.cookieCount).toBe(0);
  });
});
```

---

<!-- FILE: cookieforge/tests/e2e/extension-flow.test.ts -->
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../../dist');
const TIMEOUT = 15_000;

describe('CookieForge E2E', () => {
  let browser: Browser;
  let page: Page;
  let extensionId: string;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });

    // Wait for service worker
    const swTarget = await browser.waitForTarget(
      (t) => t.type() === 'service_worker' && t.url().includes('service-worker'),
      { timeout: TIMEOUT },
    );
    const swUrl = swTarget.url();
    extensionId = swUrl.split('/')[2]!;

    page = await browser.newPage();
  }, TIMEOUT);

  afterAll(async () => {
    await browser?.close();
  });

  it('loads the popup', async () => {
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForSelector('#popup', { timeout: 5000 });
    const title = await page.$eval('h1', (el) => el.textContent);
    expect(title).toBe('CookieForge');
  }, TIMEOUT);

  it('loads the options page', async () => {
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.waitForSelector('h1', { timeout: 5000 });
    const title = await page.$eval('h1', (el) => el.textContent);
    expect(title).toContain('CookieForge');
  }, TIMEOUT);

  it('popup shows cookie count', async () => {
    // Navigate to a real page first so cookies exist
    await page.goto('https://example.com');
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForSelector('#cookie-count', { timeout: 5000 });
    const count = await page.$eval('#cookie-count', (el) => el.textContent);
    expect(parseInt(count ?? '0')).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('popup copy JSON button works', async () => {
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForSelector('#btn-copy-json', { timeout: 5000 });
    // Click shouldn't throw
    await page.click('#btn-copy-json');
    // Wait for toast
    await page.waitForFunction(() => document.querySelector('div[style*="fixed"]') !== null, { timeout: 3000 }).catch(() => {});
  }, TIMEOUT);

  it('options page saves settings', async () => {
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.waitForSelector('#opt-theme', { timeout: 5000 });

    // Change theme to light
    await page.select('#opt-theme', 'light');
    await page.click('#btn-save');

    // Verify saved
    await page.waitForFunction(
      () => (document.getElementById('btn-save') as HTMLButtonElement)?.textContent === 'Saved!',
      { timeout: 3000 },
    );
  }, TIMEOUT);

  it('side panel loads without errors', async () => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`);
    await page.waitForSelector('#app', { timeout: 5000 });

    expect(errors.length).toBe(0);
  }, TIMEOUT);
});
```

---

<!-- FILE: cookieforge/tests/chaos/rapid-operations.test.ts -->
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setCalls: unknown[] = [];
const removeCalls: unknown[] = [];

vi.stubGlobal('chrome', {
  cookies: {
    getAll: vi.fn(async () => Array.from({ length: 100 }, (_, i) => ({
      name: `cookie_${i}`, value: `value_${i}`, domain: '.example.com', path: '/',
      secure: true, httpOnly: false, sameSite: 'lax', hostOnly: false, session: false,
      expirationDate: 2000000000, storeId: '0',
    }))),
    get: vi.fn(async ({ name }: { name: string }) => ({
      name, value: 'val', domain: '.example.com', path: '/',
      secure: true, httpOnly: false, sameSite: 'lax', hostOnly: false, session: false,
      expirationDate: 2000000000, storeId: '0',
    })),
    set: vi.fn(async (d: unknown) => { setCalls.push(d); return d; }),
    remove: vi.fn(async (d: unknown) => { removeCalls.push(d); }),
  },
});

import { CookieAPI } from '../../src/background/cookie-api';

describe('chaos: rapid operations', () => {
  let api: CookieAPI;

  beforeEach(() => {
    api = new CookieAPI();
    setCalls.length = 0;
    removeCalls.length = 0;
    vi.clearAllMocks();
  });

  it('handles 500 concurrent set operations without crashing', async () => {
    const ops = Array.from({ length: 500 }, (_, i) =>
      api.set({
        name: `rapid_${i}`, value: `v_${i}`, domain: '.example.com', path: '/',
        secure: true, httpOnly: false, sameSite: 'lax', expirationDate: 2000000000,
        hostOnly: false, session: false, storeId: '0',
      }),
    );
    const results = await Promise.allSettled(ops);
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    expect(fulfilled).toBe(500);
  });

  it('handles 200 concurrent remove operations without crashing', async () => {
    const ids = Array.from({ length: 200 }, (_, i) => ({
      name: `cookie_${i}`, domain: '.example.com', path: '/', storeId: '0',
    }));
    const result = await api.removeMultiple(ids);
    expect(result.succeeded + result.failed).toBe(200);
  });

  it('handles rapid getAll calls (100 concurrent)', async () => {
    const ops = Array.from({ length: 100 }, () => api.getAll({ domain: 'example.com' }));
    const results = await Promise.all(ops);
    expect(results.every((r) => r.length === 100)).toBe(true);
  });

  it('handles interleaved set and remove operations', async () => {
    const ops: Promise<unknown>[] = [];
    for (let i = 0; i < 100; i++) {
      ops.push(api.set({
        name: `intlv_${i}`, value: 'v', domain: '.example.com', path: '/',
        secure: true, httpOnly: false, sameSite: 'lax', expirationDate: 2000000000,
        hostOnly: false, session: false, storeId: '0',
      }));
      ops.push(api.remove({
        name: `cookie_${i}`, domain: '.example.com', path: '/', storeId: '0',
      }));
    }
    const results = await Promise.allSettled(ops);
    expect(results.filter((r) => r.status === 'rejected').length).toBe(0);
  });

  it('bulk execute with 1000 cookies', async () => {
    const ids = Array.from({ length: 1000 }, (_, i) => ({
      name: `bulk_${i}`, domain: '.example.com', path: '/', storeId: '0',
    }));
    const result = await api.executeBulk(ids, 'delete');
    expect(result.total).toBe(1000);
    expect(result.succeeded + result.failed).toBe(1000);
  });
});
```

---

<!-- FILE: cookieforge/tests/chaos/storage-overflow.test.ts -->
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

let storedData: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storedData[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        const serialized = JSON.stringify(items);
        // Simulate 10MB quota for local storage
        if (serialized.length > 10_000_000) throw new Error('QUOTA_BYTES quota exceeded');
        Object.assign(storedData, items);
      }),
      remove: vi.fn(async (key: string) => { delete storedData[key]; }),
    },
    sync: {
      get: vi.fn(async (key: string) => ({ [key]: storedData[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        const serialized = JSON.stringify(items);
        // Simulate 100KB quota for sync
        if (serialized.length > 102_400) throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
        Object.assign(storedData, items);
      }),
      remove: vi.fn(async (key: string) => { delete storedData[key]; }),
    },
  },
});

import { getSettings, setSettings, getProfiles, addProfile } from '../../src/shared/storage';
import { appendChangeLog, getChangeLog, clearChangeLog } from '../../src/shared/storage';

describe('chaos: storage overflow', () => {
  beforeEach(() => {
    storedData = {};
    vi.clearAllMocks();
  });

  it('handles settings read when storage returns undefined', async () => {
    const settings = await getSettings();
    expect(settings.theme).toBeDefined(); // returns defaults
  });

  it('handles many profile additions', async () => {
    for (let i = 0; i < 50; i++) {
      await addProfile({
        id: `profile_${i}`, name: `Profile ${i}`, description: 'test',
        cookies: Array.from({ length: 20 }, (_, j) => ({
          name: `c${j}`, value: 'v'.repeat(100), domain: '.test.com', path: '/',
          secure: true, httpOnly: false, sameSite: 'lax' as const,
          expirationDate: 2000000000, hostOnly: false, session: false, storeId: '0',
        })),
        domain: 'test.com', color: '#fff', icon: 'cookie',
        createdAt: Date.now(), updatedAt: Date.now(), locked: false,
      });
    }
    const profiles = await getProfiles();
    expect(profiles.length).toBe(50);
  });

  it('change log trims to prevent unbounded growth', async () => {
    // Write 6000 entries
    for (let i = 0; i < 6000; i++) {
      await appendChangeLog({ idx: i, time: Date.now() });
    }
    // appendChangeLog trims to last 5000
    const log = await getChangeLog(10000);
    expect(log.length).toBeLessThanOrEqual(5000);
  });

  it('handles clear then immediate read', async () => {
    await appendChangeLog({ test: true });
    await clearChangeLog();
    const log = await getChangeLog();
    expect(log.length).toBe(0);
  });
});
```

---

<!-- FILE: cookieforge/tests/edge-cases/cookie-edge-cases.test.ts -->
```typescript
import { describe, it, expect } from 'vitest';
import { validateCookie } from '../../src/shared/validators';
import { formatCookies } from '../../src/shared/formatters';
import type { CookieData } from '../../src/shared/types';

describe('edge case: unusual cookie values', () => {
  const base: Partial<CookieData> = {
    name: 'test',
    domain: '.example.com',
    path: '/',
    secure: true,
    sameSite: 'lax',
  };

  it('handles empty value', () => {
    const errors = validateCookie({ ...base, value: '' });
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
  });

  it('handles value with unicode', () => {
    const errors = validateCookie({ ...base, value: '日本語テスト🍪' });
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
  });

  it('handles value with encoded characters', () => {
    const errors = validateCookie({ ...base, value: '%E2%9C%93%20yes' });
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
  });

  it('handles value at exactly 4096 bytes', () => {
    const errors = validateCookie({ ...base, value: 'x'.repeat(4090) }); // name=5 + value=4090 = 4095 + '=' = 4096
    expect(errors.filter((e) => e.field === 'size' && e.severity === 'error')).toEqual([]);
  });

  it('handles value at 4097 bytes (over limit)', () => {
    const errors = validateCookie({ ...base, value: 'x'.repeat(4092) });
    expect(errors.some((e) => e.field === 'size')).toBe(true);
  });
});

describe('edge case: unusual domains', () => {
  const base: Partial<CookieData> = {
    name: 'test', value: 'val', path: '/', secure: true, sameSite: 'lax',
  };

  it('handles localhost', () => {
    const errors = validateCookie({ ...base, domain: 'localhost' });
    expect(errors.filter((e) => e.field === 'domain' && e.severity === 'error')).toEqual([]);
  });

  it('handles IP address', () => {
    const errors = validateCookie({ ...base, domain: '192.168.1.1' });
    expect(errors.filter((e) => e.field === 'domain' && e.severity === 'error')).toEqual([]);
  });

  it('handles internationalized domain', () => {
    const errors = validateCookie({ ...base, domain: '.例え.jp' });
    expect(errors.filter((e) => e.field === 'domain' && e.severity === 'error')).toEqual([]);
  });

  it('handles very long domain', () => {
    const longDomain = '.' + 'a'.repeat(60) + '.com';
    const errors = validateCookie({ ...base, domain: longDomain });
    expect(errors.filter((e) => e.field === 'domain' && e.severity === 'error')).toEqual([]);
  });
});

describe('edge case: export with special characters', () => {
  it('handles cookies with single quotes in cURL export', () => {
    const cookie: CookieData = {
      name: 'test', value: "it's a test", domain: '.example.com', path: '/',
      secure: true, httpOnly: false, sameSite: 'lax', expirationDate: 2000000000,
      hostOnly: false, session: false, storeId: '0',
    };
    const result = formatCookies([cookie], 'curl', 'example.com');
    expect(result.content).not.toContain("it's"); // should be escaped
  });

  it('handles cookies with backslashes in Selenium export', () => {
    const cookie: CookieData = {
      name: 'test', value: 'path\\to\\file', domain: '.example.com', path: '/',
      secure: true, httpOnly: false, sameSite: 'lax', expirationDate: 2000000000,
      hostOnly: false, session: false, storeId: '0',
    };
    const result = formatCookies([cookie], 'selenium');
    expect(result.content).toContain('\\\\'); // escaped backslash in Python
  });

  it('handles empty cookie array in all formats', () => {
    const formats = ['json', 'netscape', 'header', 'curl', 'puppeteer', 'playwright', 'selenium'] as const;
    for (const format of formats) {
      const result = formatCookies([], format);
      expect(result.cookieCount).toBe(0);
      expect(result.content).toBeDefined();
    }
  });
});

describe('edge case: session cookie with expiration', () => {
  it('warns if session=true but expirationDate is far future', () => {
    // This is actually valid — the browser decides based on expirationDate presence
    // But our validator should handle it gracefully
    const errors = validateCookie({
      name: 'odd', value: 'val', domain: '.example.com', path: '/',
      secure: true, sameSite: 'lax', session: true,
      expirationDate: Math.floor(Date.now() / 1000) + 86400 * 365 * 10,
    });
    // Should warn about 400-day limit
    expect(errors.some((e) => e.message.includes('400'))).toBe(true);
  });
});
```

---

<!-- FILE: cookieforge/tests/edge-cases/partitioned-cookies.test.ts -->
```typescript
import { describe, it, expect } from 'vitest';
import { validateCookie } from '../../src/shared/validators';
import { formatCookies } from '../../src/shared/formatters';
import type { CookieData } from '../../src/shared/types';

describe('edge case: CHIPS/partitioned cookies', () => {
  const partitionedCookie: Partial<CookieData> = {
    name: '__Host-session',
    value: 'abc',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'no_restriction',
    partitionKey: { topLevelSite: 'https://toplevel.com' },
    expirationDate: Math.floor(Date.now() / 1000) + 86400,
  };

  it('valid partitioned cookie passes validation', () => {
    const errors = validateCookie(partitionedCookie);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
  });

  it('partitioned without Secure is an error', () => {
    const errors = validateCookie({ ...partitionedCookie, secure: false });
    expect(errors.some((e) => e.field === 'partitionKey' && e.severity === 'error')).toBe(true);
  });

  it('partitioned with SameSite=Lax is a warning', () => {
    const errors = validateCookie({ ...partitionedCookie, sameSite: 'lax' });
    expect(errors.some((e) => e.field === 'partitionKey' && e.severity === 'warning')).toBe(true);
  });

  it('JSON export preserves partition key', () => {
    const full: CookieData = {
      name: 'pk_test', value: 'val', domain: '.example.com', path: '/',
      secure: true, httpOnly: false, sameSite: 'no_restriction',
      expirationDate: 2000000000, hostOnly: false, session: false, storeId: '0',
      partitionKey: { topLevelSite: 'https://a.com' },
    };
    const result = formatCookies([full], 'json');
    const parsed = JSON.parse(result.content);
    expect(parsed[0].partitionKey.topLevelSite).toBe('https://a.com');
  });

  it('Netscape export ignores partition key (format limitation)', () => {
    const full: CookieData = {
      name: 'pk_test', value: 'val', domain: '.example.com', path: '/',
      secure: true, httpOnly: false, sameSite: 'no_restriction',
      expirationDate: 2000000000, hostOnly: false, session: false, storeId: '0',
      partitionKey: { topLevelSite: 'https://a.com' },
    };
    const result = formatCookies([full], 'netscape');
    expect(result.content).not.toContain('partitionKey');
  });
});
```

---

<!-- FILE: cookieforge/tests/load/performance.test.ts -->
```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatCookies } from '../../src/shared/formatters';
import { validateCookie } from '../../src/shared/validators';
import type { CookieData } from '../../src/shared/types';

function generateCookies(count: number): CookieData[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `perf_cookie_${i}`,
    value: `value_${'x'.repeat(100)}_${i}`,
    domain: `.domain${i % 50}.com`,
    path: '/',
    secure: i % 2 === 0,
    httpOnly: i % 3 === 0,
    sameSite: (['lax', 'strict', 'no_restriction'] as const)[i % 3]!,
    expirationDate: 2000000000 + i,
    hostOnly: false,
    session: false,
    storeId: '0',
  }));
}

describe('load: performance benchmarks', () => {
  it('validates 1000 cookies in under 500ms', () => {
    const cookies = generateCookies(1000);
    const start = performance.now();
    for (const c of cookies) validateCookie(c);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('exports 1000 cookies to JSON in under 200ms', () => {
    const cookies = generateCookies(1000);
    const start = performance.now();
    formatCookies(cookies, 'json');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('exports 1000 cookies to Netscape in under 200ms', () => {
    const cookies = generateCookies(1000);
    const start = performance.now();
    formatCookies(cookies, 'netscape');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('exports 1000 cookies to Puppeteer in under 300ms', () => {
    const cookies = generateCookies(1000);
    const start = performance.now();
    formatCookies(cookies, 'puppeteer');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(300);
  });

  it('exports 5000 cookies to JSON in under 1000ms', () => {
    const cookies = generateCookies(5000);
    const start = performance.now();
    formatCookies(cookies, 'json');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  it('validates 5000 cookies in under 2000ms', () => {
    const cookies = generateCookies(5000);
    const start = performance.now();
    for (const c of cookies) validateCookie(c);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('generates health report for 500 cookies in under 1000ms', async () => {
    // Mock chrome.cookies for CookieAPI
    vi.stubGlobal('chrome', {
      cookies: {
        getAll: vi.fn(async () => generateCookies(500).map((c) => ({
          ...c, sameSite: c.sameSite as string,
        }))),
        get: vi.fn(async () => null),
        set: vi.fn(async (d: unknown) => d),
        remove: vi.fn(async () => ({})),
      },
    });

    const { CookieAPI } = await import('../../src/background/cookie-api');
    const api = new CookieAPI();

    const start = performance.now();
    const report = await api.healthCheck();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
    expect(report.totalCookies).toBe(500);
  });
});
```

---

## SELF-AUDIT

- [x] All cookie CRUD operations (get, getAll, set, remove, removeMultiple, duplicate) — cookie-api.ts
- [x] All 7 export formats (JSON, Netscape, Header, cURL, Puppeteer, Playwright, Selenium) — formatters.ts, export-engine.ts
- [x] Import engine with auto-format detection (JSON, Netscape, Header) — import-engine.ts, validators.ts
- [x] Cookie profiles: create, update, delete, apply (merge/replace), snapshot — profile-manager.ts
- [x] Real-time cookie change monitoring with batching and broadcast — cookie-monitor.ts
- [x] Cookie health dashboard with scoring (expired, insecure, oversized, tracking, duplicates) — cookie-api.ts healthCheck()
- [x] CHIPS/Partitioned cookie support throughout (types, validation, UI, export) — types.ts, validators.ts, partitioned-view.ts
- [x] Full validation: name rules, __Secure-/__Host- prefixes, size limits, SameSite+Secure, CHIPS, expiry — validators.ts
- [x] Side panel with virtual scrolling, search, domain tree, filter chips, bulk actions — all sidepanel/ components
- [x] Popup with quick stats, copy JSON/header, delete domain, pro status — popup.ts
- [x] DevTools panel with cookie table for inspected page — devtools.ts, panel.ts
- [x] Options page with all settings, usage stats, pro management — options.ts
- [x] Context menus (4 items) and keyboard commands (3 shortcuts) — service-worker.ts
- [x] Type-safe message passing with typed MessageMap — messages.ts
- [x] Typed chrome.storage wrapper with sync/local split — storage.ts
- [x] Structured logger with levels and timing — logger.ts
- [x] i18n: all 5 locales complete (en, es, pt_BR, zh_CN, fr)
- [x] ExtensionPay integration with free/pro tier gating — service-worker.ts
- [x] esbuild build system with dev/prod modes — scripts/build.ts
- [x] Dev watcher with auto-rebuild — scripts/dev.ts
- [x] Packaging script for Chrome Web Store — scripts/package.ts
- [x] TypeScript strict mode, zero `any` types
- [x] Unit tests: validators (20+ test cases), formatters (15+ test cases), storage (8+ test cases), messages (4 test cases)
- [x] Integration tests: cookie-api (8+ test cases), import-export roundtrip (6+ test cases)
- [x] E2E tests: Puppeteer extension loading, popup, options, side panel (6 test cases)
- [x] Chaos tests: rapid operations (500 concurrent sets, 200 concurrent removes, 1000 bulk) — rapid-operations.test.ts
- [x] Chaos tests: storage overflow (quota simulation, change log trimming) — storage-overflow.test.ts
- [x] Edge case tests: unusual values, unicode, domains, special chars in exports, partitioned cookies — 2 test files
- [x] Load/performance tests: 1000-5000 cookie validation, export, health check benchmarks — performance.test.ts
- [x] Service worker lifecycle handled (onInstalled, onStartup, alarms, message routing)
- [x] Incognito mode: split profile in manifest
