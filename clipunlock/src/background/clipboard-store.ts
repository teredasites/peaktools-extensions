import { openDB, type IDBPDatabase } from 'idb';
import type { ClipboardEntry, ContentType, Collection, ProStatus } from '../shared/types';
import { IDB_NAME, IDB_VERSION, IDB_STORE_CLIPS, IDB_STORE_COLLECTIONS, FREE_MAX_ITEMS, PRO_MAX_ITEMS, FREE_MAX_PINS, FREE_MAX_TAGS, FREE_MAX_COLLECTIONS, PRO_MAX_COLLECTIONS, FREE_MAX_PROJECTS, PRO_MAX_PROJECTS, MAX_ITEM_SIZE_BYTES, PREVIEW_LENGTH, DEDUP_WINDOW_MS, COLLECTION_COLORS } from '../shared/constants';
import { createLogger } from '../shared/logger';

const log = createLogger('clipboard-store');

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(IDB_NAME, IDB_VERSION, {
    async upgrade(database, oldVersion, _newVersion, transaction) {
      // v1: clips store
      if (!database.objectStoreNames.contains(IDB_STORE_CLIPS)) {
        const store = database.createObjectStore(IDB_STORE_CLIPS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('sourceDomain', 'sourceDomain');
        store.createIndex('contentType', 'contentType');
        store.createIndex('pinned', 'pinned');
        store.createIndex('searchText', 'searchText');
      }
      // v2: collections store + collection index on clips
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains(IDB_STORE_COLLECTIONS)) {
          const collStore = database.createObjectStore(IDB_STORE_COLLECTIONS, { keyPath: 'id' });
          collStore.createIndex('name', 'name');
          collStore.createIndex('createdAt', 'createdAt');
        }
        // Add collection index to clips store — use the upgrade transaction, not database.transaction()
        const clipsStore = transaction.objectStore(IDB_STORE_CLIPS);
        if (!clipsStore.indexNames.contains('collection')) {
          clipsStore.createIndex('collection', 'collection');
        }
      }
      // v3: add project fields to existing collections
      if (oldVersion < 3) {
        const collStore = transaction.objectStore(IDB_STORE_COLLECTIONS);
        const allColls = await collStore.getAll() as Collection[];
        for (const c of allColls) {
          if (c.isProject === undefined) {
            c.isProject = false;
            c.autoCaptureDomains = [];
            c.description = '';
            await collStore.put(c);
          }
        }
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
  const lines = trimmed.split('\n');

  // ── URL detection ──
  // Single URL on its own line
  if (/^https?:\/\/\S+$/i.test(trimmed)) return 'url';
  // Bare domain with path (e.g. "example.com/path") — must be the entire text
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+\/?(\S*)$/i.test(trimmed)) return 'url';
  // Multiple URLs on separate lines (list of links, every line must be a URL)
  if (lines.length >= 2 && lines.length <= 50 && lines.every((l) => /^\s*(https?:\/\/\S+)\s*$/i.test(l))) return 'url';
  // Short text (≤ 200 chars, single line) that is primarily a URL — avoids mis-categorizing paragraphs that mention a link
  if (trimmed.length <= 200 && lines.length === 1 && /https?:\/\/\S{8,}/i.test(trimmed)) return 'url';
  // Bare domain (e.g. "google.com", "docs.github.io")
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,}){1,3}$/i.test(trimmed)) return 'url';

  // ── Email detection ──
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  if (lines.length >= 1 && lines.length <= 20 && lines.every((l) => /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*$/.test(l))) return 'email';

  // ── Code detection — generous multi-language ──
  // JavaScript/TypeScript keywords anywhere in the text (not just first line)
  if (/^(function|const|let|var|class|import|export|interface|type|enum|if|for|while|return|async|await|switch|case|default|try|catch|throw|new|this|super)\b/m.test(trimmed)) return 'code';
  // Python keywords
  if (/^(def |class |import |from |if |elif |else:|for |while |try:|except |with |lambda |return |yield |raise |async def |await )/m.test(trimmed)) return 'code';
  // CSS rules
  if (/^[.#@]?[a-z_-][\w-]*\s*\{[\s\S]*\}/im.test(trimmed)) return 'code';
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/im.test(trimmed)) return 'code';
  // Shell commands — check any line, not just first
  if (/^(\$|>|#!\/|sudo |npm |npx |yarn |pip |git |docker |curl |wget |chmod |mkdir |cd |ls |cat |echo |brew |apt |pacman |dnf )/m.test(trimmed)) return 'code';
  // JSON-like content (starts with { or [ and ends with } or ])
  if (/^\s*[\[{]/.test(trimmed) && /[\]}]\s*$/.test(trimmed) && lines.length >= 2) return 'code';
  // Assignment-heavy content (e.g. config files, variable declarations) — require at least 3 and >=50% of lines
  const assignmentLines = lines.filter((l) => /^\s*\w+\s*[:=]/.test(l)).length;
  if (assignmentLines >= 3 && assignmentLines / lines.length >= 0.5) return 'code';
  // Multi-line with code-like syntax: braces, semicolons, arrows, indentation patterns
  if (lines.length >= 3) {
    const codeIndicators = [
      /[{}\[\]();]/.test(text),                           // brackets/parens/semicolons
      /=>|->|::|\.\.\.|\?\?|&&|\|\|/.test(text),         // operators
      lines.filter((l) => /^\s{2,}/.test(l)).length >= 2, // multiple indented lines
      lines.filter((l) => /;\s*$/.test(l)).length >= 2,   // lines ending in semicolons
      lines.filter((l) => /^\s*(\/\/|#|\/\*|\*|---)/.test(l)).length >= 1, // comment lines
      /!==?|===?/.test(text),                             // strict equality operators
    ];
    if (codeIndicators.filter(Boolean).length >= 3) return 'code';
  }
  // Single line with strong code patterns (function defs, arrow functions, method calls)
  if (/^(function\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|\(\)\s*=>|console\.\w+\(|document\.\w+\(|window\.\w+\(|process\.\w+\()/.test(trimmed)) return 'code';
  // Looks like a file path (entire text is just a path)
  if (/^(\/[\w.-]+){2,}$/.test(trimmed) || /^[A-Z]:\\[\w\\.-]+$/i.test(trimmed)) return 'code';

  // ── HTML detection ──
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|img|table|form|input|script|style|link|meta)\b[\s\S]*>/i.test(trimmed)) return 'html';
  if ((trimmed.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length >= 2) return 'html';

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
  citation?: string | null;
  pdfCleaned?: boolean;
  contentTypeOverride?: string;
}, proStatus: ProStatus): Promise<{ entry: ClipboardEntry; limitWarning: string | null } | null> {
  const { content, html, sourceUrl, sourceTitle, wasUnlocked, watermarkStripped, citation, pdfCleaned, contentTypeOverride } = params;
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

  let sourceDomain = '';
  try {
    sourceDomain = new URL(sourceUrl).hostname;
  } catch {
    sourceDomain = sourceUrl;
  }

  const entry: ClipboardEntry = {
    id: generateId(),
    content,
    html,
    contentType: (contentTypeOverride as ContentType) || detectContentType(content),
    sourceUrl,
    sourceDomain,
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
    collection: null,
    citation: citation ?? null,
    pdfCleaned: pdfCleaned ?? false,
  };
  // Auto-capture: if no explicit collection, check project domains
  if (!entry.collection && entry.sourceDomain) {
    const collections = await database.getAll(IDB_STORE_COLLECTIONS) as Collection[];
    const match = collections.find(
      (c) => c.isProject && c.autoCaptureDomains.length > 0 &&
        c.autoCaptureDomains.some((d) => entry.sourceDomain.includes(d))
    );
    if (match) {
      entry.collection = match.id;
    }
  }

  const maxItems = proStatus.isPro ? PRO_MAX_ITEMS : FREE_MAX_ITEMS;
  const count = await database.count(IDB_STORE_CLIPS);
  let limitWarning: string | null = null;
  if (count >= maxItems) {
    await evictOldest(database, count - maxItems + 1);
    if (!proStatus.isPro) {
      limitWarning = `Free plan: ${FREE_MAX_ITEMS} items max. Oldest clips are being removed.`;
    }
  }
  await database.put(IDB_STORE_CLIPS, entry);

  // Update project item count if auto-captured
  if (entry.collection) {
    await recalcCollectionCount(database, entry.collection);
  }

  log.info(`stored clipboard item: ${entry.id} (${entry.contentType})${entry.collection ? ` → project ${entry.collection}` : ''}`);
  return { entry, limitWarning };
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

export async function pinClipboardItem(id: string, pinned: boolean, proStatus?: ProStatus): Promise<{ ok: boolean; error?: string }> {
  const database = await getDB();
  const entry = await database.get(IDB_STORE_CLIPS, id) as ClipboardEntry | undefined;
  if (!entry) return { ok: false, error: 'Item not found' };

  // Enforce pin limit for free users
  if (pinned && !(proStatus?.isPro)) {
    const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
    let pinnedCount = 0;
    let cursor = await tx.store.openCursor();
    while (cursor) {
      if ((cursor.value as ClipboardEntry).pinned) pinnedCount++;
      cursor = await cursor.continue();
    }
    if (pinnedCount >= FREE_MAX_PINS) {
      return { ok: false, error: `Free plan limited to ${FREE_MAX_PINS} pins. Upgrade to Pro for unlimited.` };
    }
  }

  entry.pinned = pinned;
  await database.put(IDB_STORE_CLIPS, entry);
  return { ok: true };
}

export async function tagClipboardItem(id: string, tags: string[], proStatus?: ProStatus): Promise<{ ok: boolean; error?: string }> {
  const database = await getDB();
  const entry = await database.get(IDB_STORE_CLIPS, id) as ClipboardEntry | undefined;
  if (!entry) return { ok: false, error: 'Item not found' };

  // Enforce tag limit for free users
  if (!(proStatus?.isPro) && tags.length > FREE_MAX_TAGS) {
    return { ok: false, error: `Free plan limited to ${FREE_MAX_TAGS} tags per item. Upgrade to Pro for unlimited.` };
  }

  entry.tags = tags;
  await database.put(IDB_STORE_CLIPS, entry);
  return { ok: true };
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
      // Ensure new fields exist on imported entries
      const safe: ClipboardEntry = {
        ...entry,
        collection: entry.collection ?? null,
        citation: entry.citation ?? null,
        pdfCleaned: entry.pdfCleaned ?? false,
      };
      await tx.store.put(safe);
      imported++;
    }
  }
  await tx.done;
  log.info(`imported ${imported} clipboard items`);
  return imported;
}

// ─── Collections CRUD ───

export async function getCollections(): Promise<Collection[]> {
  const database = await getDB();
  const tx = database.transaction(IDB_STORE_COLLECTIONS, 'readonly');
  const all = await tx.store.getAll() as Collection[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function createCollection(name: string, proStatus: ProStatus): Promise<{ ok: boolean; collection?: Collection; error?: string }> {
  const database = await getDB();

  // Check limit
  const count = await database.count(IDB_STORE_COLLECTIONS);
  const maxCollections = proStatus.isPro ? PRO_MAX_COLLECTIONS : FREE_MAX_COLLECTIONS;
  if (count >= maxCollections) {
    return { ok: false, error: `${proStatus.isPro ? 'Pro' : 'Free'} plan limited to ${maxCollections} collections.${proStatus.isPro ? '' : ' Upgrade to Pro for more.'}` };
  }

  // Check for duplicate name
  const existing = await database.getAll(IDB_STORE_COLLECTIONS) as Collection[];
  if (existing.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
    return { ok: false, error: 'A collection with that name already exists.' };
  }

  const colorIndex = count % COLLECTION_COLORS.length;
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: COLLECTION_COLORS[colorIndex] as string,
    createdAt: Date.now(),
    itemCount: 0,
    isProject: false,
    autoCaptureDomains: [],
    description: '',
  };
  await database.put(IDB_STORE_COLLECTIONS, collection);
  log.info(`created collection: ${collection.id} "${collection.name}"`);
  return { ok: true, collection };
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const database = await getDB();

  // Un-assign all clips in this collection
  const tx = database.transaction(IDB_STORE_CLIPS, 'readwrite');
  let cursor = await tx.store.index('collection').openCursor(IDBKeyRange.only(collectionId));
  while (cursor) {
    const entry = cursor.value as ClipboardEntry;
    entry.collection = null;
    await cursor.update(entry);
    cursor = await cursor.continue();
  }
  await tx.done;

  await database.delete(IDB_STORE_COLLECTIONS, collectionId);
  log.info(`deleted collection: ${collectionId}`);
}

export async function renameCollection(collectionId: string, newName: string): Promise<{ ok: boolean; error?: string }> {
  const database = await getDB();
  const collection = await database.get(IDB_STORE_COLLECTIONS, collectionId) as Collection | undefined;
  if (!collection) return { ok: false, error: 'Collection not found' };

  // Check for duplicate name
  const all = await database.getAll(IDB_STORE_COLLECTIONS) as Collection[];
  if (all.some((c) => c.id !== collectionId && c.name.toLowerCase() === newName.trim().toLowerCase())) {
    return { ok: false, error: 'A collection with that name already exists.' };
  }

  collection.name = newName.trim();
  await database.put(IDB_STORE_COLLECTIONS, collection);
  log.info(`renamed collection ${collectionId} to "${newName}"`);
  return { ok: true };
}

export async function setItemCollection(itemId: string, collectionId: string | null): Promise<{ ok: boolean; error?: string }> {
  const database = await getDB();
  const entry = await database.get(IDB_STORE_CLIPS, itemId) as ClipboardEntry | undefined;
  if (!entry) return { ok: false, error: 'Item not found' };

  const oldCollection = entry.collection;
  entry.collection = collectionId;
  await database.put(IDB_STORE_CLIPS, entry);

  // Update item counts on affected collections
  if (oldCollection) {
    await recalcCollectionCount(database, oldCollection);
  }
  if (collectionId) {
    await recalcCollectionCount(database, collectionId);
  }

  return { ok: true };
}

async function recalcCollectionCount(database: IDBPDatabase, collectionId: string): Promise<void> {
  const collection = await database.get(IDB_STORE_COLLECTIONS, collectionId) as Collection | undefined;
  if (!collection) return;
  const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
  const index = tx.store.index('collection');
  const count = await index.count(IDBKeyRange.only(collectionId));
  collection.itemCount = count;
  await database.put(IDB_STORE_COLLECTIONS, collection);
}

/** Get a single clipboard item by ID */
export async function getClipboardItem(id: string): Promise<ClipboardEntry | null> {
  const database = await getDB();
  const entry = await database.get(IDB_STORE_CLIPS, id) as ClipboardEntry | undefined;
  return entry ?? null;
}

/** Get items for quick-paste: most recent N items, optionally from pinned only */
export async function getQuickPasteItems(limit = 10): Promise<ClipboardEntry[]> {
  const database = await getDB();
  const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
  const index = tx.store.index('timestamp');
  const items: ClipboardEntry[] = [];

  // First, get pinned items (most useful for quick paste)
  let cursor = await index.openCursor(null, 'prev');
  const pinned: ClipboardEntry[] = [];
  const recent: ClipboardEntry[] = [];
  while (cursor) {
    const entry = cursor.value as ClipboardEntry;
    if (entry.pinned && pinned.length < limit) {
      pinned.push(entry);
    } else if (!entry.pinned && recent.length < limit) {
      recent.push(entry);
    }
    if (pinned.length + recent.length >= limit * 2) break;
    cursor = await cursor.continue();
  }

  // Pinned first, then recent, capped at limit
  items.push(...pinned);
  for (const r of recent) {
    if (items.length >= limit) break;
    items.push(r);
  }

  return items.slice(0, limit);
}

// ─── Projects (enhanced collections) ───

export async function createProject(
  name: string,
  domains: string[],
  description: string,
  proStatus: ProStatus,
): Promise<{ ok: boolean; collection?: Collection; error?: string }> {
  const database = await getDB();

  // Count existing projects
  const all = await database.getAll(IDB_STORE_COLLECTIONS) as Collection[];
  const projectCount = all.filter((c) => c.isProject).length;
  const maxProjects = proStatus.isPro ? PRO_MAX_PROJECTS : FREE_MAX_PROJECTS;
  if (projectCount >= maxProjects) {
    return { ok: false, error: `${proStatus.isPro ? 'Pro' : 'Free'} plan limited to ${maxProjects} projects.${proStatus.isPro ? '' : ' Upgrade to Pro for more.'}` };
  }

  // Check duplicate name
  if (all.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
    return { ok: false, error: 'A project with that name already exists.' };
  }

  const colorIndex = all.length % COLLECTION_COLORS.length;
  const project: Collection = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: COLLECTION_COLORS[colorIndex] ?? COLLECTION_COLORS[0] ?? '#3b82f6',
    createdAt: Date.now(),
    itemCount: 0,
    isProject: true,
    autoCaptureDomains: domains.map((d) => d.trim().toLowerCase()).filter(Boolean),
    description: description.trim(),
  };
  await database.put(IDB_STORE_COLLECTIONS, project);
  log.info(`created project: ${project.id} "${project.name}" domains=[${project.autoCaptureDomains}]`);
  return { ok: true, collection: project };
}

export async function updateProject(
  projectId: string,
  updates: { name?: string; domains?: string[]; description?: string },
): Promise<{ ok: boolean; error?: string }> {
  const database = await getDB();
  const project = await database.get(IDB_STORE_COLLECTIONS, projectId) as Collection | undefined;
  if (!project) return { ok: false, error: 'Project not found' };

  if (updates.name !== undefined) {
    const all = await database.getAll(IDB_STORE_COLLECTIONS) as Collection[];
    if (all.some((c) => c.id !== projectId && c.name.toLowerCase() === updates.name!.trim().toLowerCase())) {
      return { ok: false, error: 'A project with that name already exists.' };
    }
    project.name = updates.name.trim();
  }
  if (updates.domains !== undefined) {
    project.autoCaptureDomains = updates.domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  }
  if (updates.description !== undefined) {
    project.description = updates.description.trim();
  }
  await database.put(IDB_STORE_COLLECTIONS, project);
  log.info(`updated project: ${project.id}`);
  return { ok: true };
}

export async function getProjectItems(collectionId: string): Promise<ClipboardEntry[]> {
  const database = await getDB();
  const tx = database.transaction(IDB_STORE_CLIPS, 'readonly');
  const index = tx.store.index('collection');
  const items = await index.getAll(IDBKeyRange.only(collectionId)) as ClipboardEntry[];
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export async function exportProjectAsText(collectionId: string): Promise<string> {
  const database = await getDB();
  const project = await database.get(IDB_STORE_COLLECTIONS, collectionId) as Collection | undefined;
  if (!project) return '';

  const items = await getProjectItems(collectionId);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines: string[] = [
    `PROJECT: ${project.name}`,
    `Exported: ${date}`,
    `Items: ${items.length}`,
    project.description ? `Description: ${project.description}` : '',
    project.autoCaptureDomains.length ? `Domains: ${project.autoCaptureDomains.join(', ')}` : '',
    '='.repeat(60),
    '',
  ].filter(Boolean);

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const ts = new Date(item.timestamp).toLocaleString();
    lines.push(`[${i + 1}] ${ts} | ${item.sourceDomain || 'manual'} | ${item.contentType}`);
    if (item.sourceTitle) lines.push(`    Title: ${item.sourceTitle}`);
    if (item.sourceUrl) lines.push(`    URL: ${item.sourceUrl}`);
    lines.push('');
    lines.push(item.content);
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('');
  }

  return lines.join('\n');
}

export async function exportProjectAsHtml(collectionId: string): Promise<string> {
  const database = await getDB();
  const project = await database.get(IDB_STORE_COLLECTIONS, collectionId) as Collection | undefined;
  if (!project) return '';

  const items = await getProjectItems(collectionId);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const itemsHtml = items.map((item, i) => {
    const ts = new Date(item.timestamp).toLocaleString();
    const isCode = item.contentType === 'code';
    const contentTag = isCode
      ? `<pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5">${escHtml(item.content)}</pre>`
      : `<div style="white-space:pre-wrap;word-break:break-word;line-height:1.6">${escHtml(item.content)}</div>`;
    const sourceLink = item.sourceUrl
      ? `<a href="${escHtml(item.sourceUrl)}" style="color:#3b82f6;text-decoration:none">${escHtml(item.sourceDomain || item.sourceUrl)}</a>`
      : (item.sourceDomain || 'manual');
    return `
    <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:12px;color:#64748b">
        <span>#${i + 1} &middot; ${escHtml(ts)}</span>
        <span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:4px;font-weight:600;text-transform:uppercase;font-size:10px">${escHtml(item.contentType)}</span>
      </div>
      ${item.sourceTitle ? `<div style="font-size:13px;color:#475569;margin-bottom:4px">${escHtml(item.sourceTitle)}</div>` : ''}
      <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">${sourceLink}</div>
      ${contentTag}
      ${item.citation ? `<div style="font-size:11px;color:#3b82f6;font-style:italic;margin-top:8px">${escHtml(item.citation)}</div>` : ''}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(project.name)} — CopyUnlock Export</title>
</head>
<body style="max-width:800px;margin:40px auto;padding:0 20px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;background:#fff">
  <h1 style="font-size:24px;margin-bottom:4px">${escHtml(project.name)}</h1>
  <p style="color:#64748b;font-size:14px;margin-bottom:8px">Exported ${escHtml(date)} &middot; ${items.length} item${items.length !== 1 ? 's' : ''}</p>
  ${project.description ? `<p style="color:#475569;font-size:14px;margin-bottom:8px">${escHtml(project.description)}</p>` : ''}
  ${project.autoCaptureDomains.length ? `<p style="color:#94a3b8;font-size:12px;margin-bottom:24px">Domains: ${project.autoCaptureDomains.map((d) => escHtml(d)).join(', ')}</p>` : '<div style="margin-bottom:24px"></div>'}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px">
  ${itemsHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="text-align:center;color:#94a3b8;font-size:12px">Exported by CopyUnlock</p>
</body>
</html>`;
}
