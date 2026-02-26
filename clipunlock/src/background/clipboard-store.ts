import { openDB, type IDBPDatabase } from 'idb';
import type { ClipboardEntry, ContentType, ProStatus } from '../shared/types';
import { IDB_NAME, IDB_VERSION, IDB_STORE_CLIPS, FREE_MAX_ITEMS, PRO_MAX_ITEMS, MAX_ITEM_SIZE_BYTES, PREVIEW_LENGTH, DEDUP_WINDOW_MS } from '../shared/constants';
import { createLogger } from '../shared/logger';

const log = createLogger('clipboard-store');

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(IDB_NAME, IDB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(IDB_STORE_CLIPS)) {
        const store = database.createObjectStore(IDB_STORE_CLIPS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('sourceDomain', 'sourceDomain');
        store.createIndex('contentType', 'contentType');
        store.createIndex('pinned', 'pinned');
        store.createIndex('searchText', 'searchText');
      }
    },
  });
  return db;
}

function generateId(): string {
  return crypto.randomUUID();
}

function detectContentType(text: string): ContentType {
  const trimmed = text.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return 'url';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  if (/^(function|const|let|var|class|import|export|if|for|while|return|async|await)\b/.test(trimmed) ||
      (/[{}\[\]();]/.test(text) && text.split('\n').length > 2)) return 'code';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return 'html';
  return 'text';
}

function makePreview(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= PREVIEW_LENGTH) return cleaned;
  return cleaned.substring(0, PREVIEW_LENGTH) + '...';
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function addClipboardItem(params: {
  content: string;
  html: string | null;
  sourceUrl: string;
  sourceTitle: string;
  wasUnlocked: boolean;
  watermarkStripped: boolean;
}, proStatus: ProStatus): Promise<ClipboardEntry | null> {
  const { content, html, sourceUrl, sourceTitle, wasUnlocked, watermarkStripped } = params;
  if (new Blob([content]).size > MAX_ITEM_SIZE_BYTES) {
    log.warn('clipboard item too large, skipping');
    return null;
  }
  const database = await getDB();
  const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
  const index = tx.store.index('timestamp');
  const now = Date.now();
  const cursor = index.openCursor(IDBKeyRange.lowerBound(now - DEDUP_WINDOW_MS), 'prev');
  const recent = await cursor;
  if (recent && (recent.value as ClipboardEntry).content === content) {
    log.debug('dedup: identical content within window');
    return null;
  }
  const entry: ClipboardEntry = {
    id: generateId(),
    content,
    html,
    contentType: detectContentType(content),
    sourceUrl,
    sourceDomain: new URL(sourceUrl).hostname,
    sourceTitle,
    timestamp: now,
    pinned: false,
    tags: [],
    favorite: false,
    charCount: content.length,
    wordCount: wordCount(content),
    preview: makePreview(content),
    wasUnlocked,
    watermarkStripped,
    searchText: content.toLowerCase(),
  };
  const maxItems = proStatus.isPro ? PRO_MAX_ITEMS : FREE_MAX_ITEMS;
  const count = await database.count(IDB_STORE_CLIPS);
  if (count >= maxItems) {
    await evictOldest(database, count - maxItems + 1);
  }
  await database.put(IDB_STORE_CLIPS, entry);
  log.info(`stored clipboard item: ${entry.id} (${entry.contentType})`);
  return entry;
}

export async function getClipboardItems(limit = 50, offset = 0): Promise<ClipboardEntry[]> {
  const database = await getDB();
  const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
  const index = tx.store.index('timestamp');
  const items: ClipboardEntry[] = [];
  let cursor = await index.openCursor(null, 'prev');
  let skipped = 0;
  while (cursor) {
    if (skipped < offset) {
      skipped++;
      cursor = await cursor.continue();
      continue;
    }
    items.push(cursor.value as ClipboardEntry);
    if (items.length >= limit) break;
    cursor = await cursor.continue();
  }
  return items;
}

export async function searchClipboard(query: string, limit = 50): Promise<ClipboardEntry[]> {
  const database = await getDB();
  const normalizedQuery = query.toLowerCase();
  const items: ClipboardEntry[] = [];
  const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
  let cursor = await tx.store.index('timestamp').openCursor(null, 'prev');
  while (cursor) {
    const entry = cursor.value as ClipboardEntry;
    if (entry.searchText.includes(normalizedQuery) ||
        entry.sourceDomain.includes(normalizedQuery) ||
        entry.tags.some((t) => t.toLowerCase().includes(normalizedQuery))) {
      items.push(entry);
      if (items.length >= limit) break;
    }
    cursor = await cursor.continue();
  }
  return items;
}

export async function deleteClipboardItem(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(IDB_STORE_CLIPS, id);
  log.info(`deleted clipboard item: ${id}`);
}

export async function pinClipboardItem(id: string, pinned: boolean): Promise<void> {
  const database = await getDB();
  const entry = await database.get(IDB_STORE_CLIPS, id) as ClipboardEntry | undefined;
  if (!entry) return;
  entry.pinned = pinned;
  await database.put(IDB_STORE_CLIPS, entry);
}

export async function tagClipboardItem(id: string, tags: string[]): Promise<void> {
  const database = await getDB();
  const entry = await database.get(IDB_STORE_CLIPS, id) as ClipboardEntry | undefined;
  if (!entry) return;
  entry.tags = tags;
  await database.put(IDB_STORE_CLIPS, entry);
}

export async function clearClipboard(): Promise<void> {
  const database = await getDB();
  await database.clear(IDB_STORE_CLIPS);
  log.info('clipboard history cleared');
}

export async function getClipboardCount(): Promise<number> {
  const database = await getDB();
  return database.count(IDB_STORE_CLIPS);
}

export async function cleanupExpired(retentionDays: number): Promise<number> {
  const database = await getDB();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const tx = database.transaction(IDB_STORE_CLIPS, 'readwrite');
  let cursor = await tx.store.index('timestamp').openCursor(IDBKeyRange.upperBound(cutoff));
  let removed = 0;
  while (cursor) {
    const entry = cursor.value as ClipboardEntry;
    if (!entry.pinned) {
      await cursor.delete();
      removed++;
    }
    cursor = await cursor.continue();
  }
  if (removed > 0) log.info(`cleaned up ${removed} expired items`);
  return removed;
}

async function evictOldest(database: IDBPDatabase, count: number): Promise<void> {
  const tx = database.transaction(IDB_STORE_CLIPS, 'readwrite');
  let cursor = await tx.store.index('timestamp').openCursor();
  let evicted = 0;
  while (cursor && evicted < count) {
    const entry = cursor.value as ClipboardEntry;
    if (!entry.pinned) {
      await cursor.delete();
      evicted++;
    }
    cursor = await cursor.continue();
  }
  log.info(`evicted ${evicted} oldest items`);
}

export async function exportClipboard(): Promise<ClipboardEntry[]> {
  const database = await getDB();
  return database.getAll(IDB_STORE_CLIPS);
}

export async function importClipboard(entries: ClipboardEntry[]): Promise<number> {
  const database = await getDB();
  const tx = database.transaction(IDB_STORE_CLIPS, 'readwrite');
  let imported = 0;
  for (const entry of entries) {
    const existing = await tx.store.get(entry.id);
    if (!existing) {
      await tx.store.put(entry);
      imported++;
    }
  }
  await tx.done;
  log.info(`imported ${imported} clipboard items`);
  return imported;
}
