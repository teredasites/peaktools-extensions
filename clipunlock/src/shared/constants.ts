export const EXT_NAME = 'CopyUnlock';
export const EXT_VERSION = __VERSION__ ?? '1.0.0';

// Clipboard limits
export const FREE_MAX_ITEMS = 500;
export const FREE_RETENTION_DAYS = 30;
export const FREE_MAX_PINS = 20;
export const FREE_MAX_TAGS = 5;
export const FREE_MAX_COLLECTIONS = 3;
export const PRO_MAX_ITEMS = 100_000;
export const PRO_RETENTION_DAYS = 3650; // 10 years
export const PRO_MAX_COLLECTIONS = 1000;
export const FREE_MAX_PROJECTS = 2;
export const PRO_MAX_PROJECTS = 100;
export const MAX_ITEM_SIZE_BYTES = 1_048_576; // 1MB
export const PREVIEW_LENGTH = 200;
export const DEDUP_WINDOW_MS = 5_000;

// Performance budgets
export const DETECT_TIMEOUT_MS = 200;
export const UNLOCK_TIMEOUT_MS = 50;
export const SEARCH_TIMEOUT_MS = 50;
export const SIDEPANEL_RENDER_MS = 200;
export const VIRTUAL_SCROLL_ITEM_HEIGHT = 72;
export const VIRTUAL_SCROLL_BUFFER = 10;

// Counter-observer
export const COUNTER_OBS_MAX_OPS_SEC = 10;
export const COUNTER_OBS_BACKOFF_BASE_MS = 100;
export const COUNTER_OBS_BACKOFF_MAX_MS = 5_000;

// Alarms
export const ALARM_CLEANUP = 'copyunlock-cleanup';
export const ALARM_CLEANUP_INTERVAL_MIN = 60; // hourly
export const ALARM_LICENSE_CHECK = 'copyunlock-license-check';
export const ALARM_LICENSE_CHECK_INTERVAL_MIN = 1440; // daily

// License API — PeakTools License Worker (Cloudflare Worker + D1 + Stripe)
export const LICENSE_API_BASE = 'https://peaktools-license.teredasoftware.workers.dev';
export const EXTENSION_SLUG = 'copyunlock';
export const LICENSE_CACHE_KEY = 'copyunlock_license_cache';
export const LICENSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Storage keys
export const STORAGE_SETTINGS = 'copyunlock_settings';
export const STORAGE_PROFILES = 'copyunlock_profiles';
export const STORAGE_STATS = 'copyunlock_stats';

// IDB
export const IDB_NAME = 'copyunlock_db';
export const IDB_VERSION = 3;
export const IDB_STORE_CLIPS = 'clips';
export const IDB_STORE_PROFILES = 'profiles';
export const IDB_STORE_COLLECTIONS = 'collections';

// Collection colors (flat, monochrome-friendly)
export const COLLECTION_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#64748b', // slate
] as const;

// Watermark characters to strip
export const WATERMARK_CHARS: number[] = [
  0x200B, // zero-width space
  0x200C, // zero-width non-joiner
  0x200D, // zero-width joiner
  0x200E, // LTR mark
  0x200F, // RTL mark
  0x2060, // word joiner
  0xFEFF, // zero-width no-break space / BOM
  0x2063, // invisible separator
  0x2061, // function application
  0x2062, // invisible times
  0x00AD, // soft hyphen
];

export const WATERMARK_REGEX = new RegExp(
  `[${WATERMARK_CHARS.map((c) => `\\u${c.toString(16).padStart(4, '0')}`).join('')}]`,
  'g'
);

// Safe mode preserve patterns
export const PRESERVE_DOMAINS: Record<string, string[]> = {
  'youtube.com': ['keydown:Space', 'keydown:ArrowLeft', 'keydown:ArrowRight', 'keydown:KeyJ', 'keydown:KeyK', 'keydown:KeyL', 'keydown:KeyF'],
  'docs.google.com': ['contextmenu', 'keydown:Enter', 'mousedown'],
  'sheets.google.com': ['contextmenu', 'keydown:Enter', 'mousedown'],
  'netflix.com': ['keydown:Space', 'keydown:ArrowLeft', 'keydown:ArrowRight'],
};

export const PRESERVE_GENERIC = ['keydown:Enter', 'keydown:Tab', 'submit', 'focus', 'blur', 'keydown:Escape'];

declare const __VERSION__: string;
