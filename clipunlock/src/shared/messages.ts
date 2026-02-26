// ─── Message types for content <-> background <-> popup communication ───

export type MessageType =
  | 'GET_TAB_STATE'
  | 'SET_TAB_STATE'
  | 'TOGGLE_UNLOCK'
  | 'SET_MODE'
  | 'DETECTION_RESULT'
  | 'UNLOCK_APPLIED'
  | 'CLIPBOARD_CAPTURE'
  | 'COPY_ITEM'
  | 'PASTE_ITEM'
  | 'GET_CLIPBOARD_HISTORY'
  | 'DELETE_CLIPBOARD_ITEM'
  | 'PIN_CLIPBOARD_ITEM'
  | 'TAG_CLIPBOARD_ITEM'
  | 'SEARCH_CLIPBOARD'
  | 'CLEAR_CLIPBOARD'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'SETTINGS_CHANGED'
  | 'GET_SITE_PROFILE'
  | 'CLEAR_SITE_PROFILE'
  | 'GET_PRO_STATUS'
  | 'CHECK_LICENSE'
  | 'OPEN_SIDEPANEL'
  | 'OPEN_CHECKOUT'
  | 'OPEN_BILLING_PORTAL'
  | 'OFFSCREEN_COPY'
  | 'OFFSCREEN_READ_CLIPBOARD'
  // Collections
  | 'GET_COLLECTIONS'
  | 'CREATE_COLLECTION'
  | 'DELETE_COLLECTION'
  | 'RENAME_COLLECTION'
  | 'SET_ITEM_COLLECTION'
  // Projects
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'EXPORT_PROJECT'
  // Quick-paste
  | 'QUICK_PASTE_ITEMS'
  // Citation
  | 'GET_CITATION';

export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
}

export interface TabStatePayload {
  tabId: number;
  enabled: boolean;
  mode: string;
  domain: string;
}

export interface DetectionResultPayload {
  tabId: number;
  profile: import('./types').SiteProtectionProfile;
}

export interface ClipboardCapturePayload {
  content: string;
  html: string | null;
  sourceUrl: string;
  sourceTitle: string;
  wasUnlocked: boolean;
  watermarkStripped: boolean;
  citation?: string;
  pdfCleaned?: boolean;
  contentTypeOverride?: string;
}

export interface ClipboardSearchPayload {
  query: string;
  filter?: import('./types').ContentType;
  limit?: number;
  offset?: number;
}

export interface ClipboardTagPayload {
  id: string;
  tags: string[];
}

export function sendMessage<T = unknown>(msg: Message<T>): Promise<unknown> {
  return chrome.runtime.sendMessage(msg);
}

export function sendTabMessage<T = unknown>(tabId: number, msg: Message<T>): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, msg);
}

export function onMessage(
  handler: (msg: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean | void
): void {
  chrome.runtime.onMessage.addListener(handler);
}
