// ─── Blocking Method Catalog (29 methods) ───

export type BlockingCategory = 'css' | 'js-event' | 'js-advanced' | 'dom' | 'server';

export interface DetectedMethod {
  id: number;
  category: BlockingCategory;
  name: string;
  elementsAffected: number;
  confidence: number;
  bypassable: boolean;
  bypassMethod: string | null;
}

export type Severity = 'none' | 'light' | 'moderate' | 'heavy' | 'extreme';
export type UnlockMode = 'auto' | 'safe' | 'aggressive';

export interface UnlockStrategy {
  mode: UnlockMode;
  steps: UnlockStep[];
  estimatedTimeMs: number;
}

export interface UnlockStep {
  methodId: number;
  action: string;
  target: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface SiteProtectionProfile {
  domain: string;
  url: string;
  timestamp: number;
  methods: DetectedMethod[];
  severity: Severity;
  recommendedStrategy: UnlockStrategy;
  safeModeConflicts: string[];
}

// ─── Clipboard ───

export type ContentType = 'text' | 'html' | 'url' | 'email' | 'code' | 'image';

export interface ClipboardEntry {
  id: string;
  content: string;
  html: string | null;
  contentType: ContentType;
  sourceUrl: string;
  sourceDomain: string;
  sourceTitle: string;
  timestamp: number;
  pinned: boolean;
  tags: string[];
  favorite: boolean;
  charCount: number;
  wordCount: number;
  preview: string;
  wasUnlocked: boolean;
  watermarkStripped: boolean;
  searchText: string;
}

// ─── Site Profiles ───

export interface SiteProfile {
  domain: string;
  lastVisited: number;
  methods: number[];
  appliedStrategy: UnlockStrategy;
  success: boolean;
  userMode: UnlockMode;
  notes: string;
}

// ─── Settings ───

export interface ExtensionSettings {
  enabled: boolean;
  defaultMode: UnlockMode;
  clipboardHistoryEnabled: boolean;
  maxItems: number;
  retentionDays: number;
  watermarkStripping: boolean;
  showNotifications: boolean;
  theme: 'dark' | 'light' | 'system';
  siteOverrides: Record<string, { enabled: boolean; mode: UnlockMode }>;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  defaultMode: 'auto',
  clipboardHistoryEnabled: true,
  maxItems: 5000,
  retentionDays: 90,
  watermarkStripping: true,
  showNotifications: true,
  theme: 'dark',
  siteOverrides: {},
};

// ─── Main World Detection Data (bridged from MAIN → ISOLATED via CustomEvent) ───

export interface MainWorldData {
  trackedListeners: Array<{ type: string; target: string }>;
  oncopy: boolean;
  oncut: boolean;
  onpaste: boolean;
  oncontextmenu: boolean;
  onselectstart: boolean;
  getSelectionOverridden: boolean;
}

// ─── ExtensionPay ───

export interface ProStatus {
  isPro: boolean;
  trialActive: boolean;
  trialDaysLeft: number;
}

// ─── Tab State ───

export interface TabState {
  tabId: number;
  url: string;
  domain: string;
  enabled: boolean;
  mode: UnlockMode;
  profile: SiteProtectionProfile | null;
  unlocked: boolean;
}
