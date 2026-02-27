// ─── Blocking Method Catalog (39 methods) ───

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

export type CitationStyle = 'none' | 'url' | 'formatted';
export type PasteFormat = 'plain' | 'rich' | 'clean' | 'with-citation';

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
  /** Collection this clip belongs to (null = uncategorized) */
  collection: string | null;
  /** Pre-generated citation string for this clip */
  citation: string | null;
  /** Whether PDF line break cleanup was applied */
  pdfCleaned: boolean;
}

// ─── Collections ───

export interface Collection {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  itemCount: number;
  /** Whether this is a project (enhanced collection with auto-capture + export) */
  isProject: boolean;
  /** Domains that auto-file clips into this project */
  autoCaptureDomains: string[];
  /** Optional project description */
  description: string;
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
  /** Auto-citation: 'none' | 'url' (free) | 'formatted' (pro) */
  autoCitation: CitationStyle;
  /** PDF line break cleanup on copy (always enabled) */
  pdfCleanup: boolean;
  /** Default paste format */
  defaultPasteFormat: PasteFormat;
  /** Show context menu (right-click menu) */
  contextMenuEnabled: boolean;
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
  autoCitation: 'url',
  pdfCleanup: true,
  defaultPasteFormat: 'plain',
  contextMenuEnabled: true,
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
