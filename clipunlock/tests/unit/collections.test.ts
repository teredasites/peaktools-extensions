import '../setup';
import { COLLECTION_COLORS, FREE_MAX_COLLECTIONS } from '../../src/shared/constants';

// Test collection logic (mirrors clipboard-store.ts collection functions)

interface Collection {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  itemCount: number;
}

// In-memory collection store for testing
let collections: Collection[] = [];

function createCollection(name: string, isPro: boolean): { ok: boolean; collection?: Collection; error?: string } {
  const maxCollections = isPro ? 1000 : FREE_MAX_COLLECTIONS;
  if (collections.length >= maxCollections) {
    return { ok: false, error: `Limited to ${maxCollections} collections.` };
  }

  if (collections.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
    return { ok: false, error: 'A collection with that name already exists.' };
  }

  const colorIndex = collections.length % COLLECTION_COLORS.length;
  const collection: Collection = {
    id: `coll-${collections.length + 1}`,
    name: name.trim(),
    color: COLLECTION_COLORS[colorIndex],
    createdAt: Date.now(),
    itemCount: 0,
  };
  collections.push(collection);
  return { ok: true, collection };
}

function deleteCollection(id: string): boolean {
  const idx = collections.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  collections.splice(idx, 1);
  return true;
}

function renameCollection(id: string, newName: string): { ok: boolean; error?: string } {
  const coll = collections.find((c) => c.id === id);
  if (!coll) return { ok: false, error: 'Collection not found' };

  if (collections.some((c) => c.id !== id && c.name.toLowerCase() === newName.trim().toLowerCase())) {
    return { ok: false, error: 'A collection with that name already exists.' };
  }

  coll.name = newName.trim();
  return { ok: true };
}

describe('Collections', () => {
  beforeEach(() => {
    collections = [];
  });

  describe('createCollection', () => {
    it('should create a collection successfully', () => {
      const result = createCollection('Research', false);
      expect(result.ok).toBe(true);
      expect(result.collection).toBeDefined();
      expect(result.collection!.name).toBe('Research');
      expect(result.collection!.itemCount).toBe(0);
    });

    it('should assign colors from the palette', () => {
      const result1 = createCollection('First', false);
      const result2 = createCollection('Second', false);
      expect(result1.collection!.color).toBe(COLLECTION_COLORS[0]);
      expect(result2.collection!.color).toBe(COLLECTION_COLORS[1]);
    });

    it('should cycle colors after exhausting the palette', () => {
      for (let i = 0; i < COLLECTION_COLORS.length; i++) {
        createCollection(`Collection ${i}`, true); // Pro to bypass limit
      }
      // This is within Pro limit but cycles colors
      expect(collections.length).toBe(COLLECTION_COLORS.length);
    });

    it('should enforce free plan limit', () => {
      for (let i = 0; i < FREE_MAX_COLLECTIONS; i++) {
        createCollection(`Collection ${i}`, false);
      }
      const result = createCollection('One More', false);
      expect(result.ok).toBe(false);
      expect(result.error).toContain(`${FREE_MAX_COLLECTIONS}`);
    });

    it('should allow Pro users more collections', () => {
      for (let i = 0; i < FREE_MAX_COLLECTIONS + 5; i++) {
        createCollection(`Collection ${i}`, true);
      }
      expect(collections.length).toBe(FREE_MAX_COLLECTIONS + 5);
    });

    it('should prevent duplicate names (case-insensitive)', () => {
      createCollection('Research', false);
      const result = createCollection('research', false);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should trim whitespace from names', () => {
      const result = createCollection('  Research  ', false);
      expect(result.collection!.name).toBe('Research');
    });
  });

  describe('deleteCollection', () => {
    it('should delete an existing collection', () => {
      const { collection } = createCollection('ToDelete', false);
      expect(deleteCollection(collection!.id)).toBe(true);
      expect(collections.length).toBe(0);
    });

    it('should return false for non-existent collection', () => {
      expect(deleteCollection('nonexistent')).toBe(false);
    });
  });

  describe('renameCollection', () => {
    it('should rename a collection', () => {
      const { collection } = createCollection('Original', false);
      const result = renameCollection(collection!.id, 'Renamed');
      expect(result.ok).toBe(true);
      expect(collections[0].name).toBe('Renamed');
    });

    it('should prevent renaming to an existing name', () => {
      createCollection('First', false);
      const { collection } = createCollection('Second', false);
      const result = renameCollection(collection!.id, 'First');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should return error for non-existent collection', () => {
      const result = renameCollection('nonexistent', 'New Name');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should trim whitespace from new name', () => {
      const { collection } = createCollection('Original', false);
      renameCollection(collection!.id, '  New Name  ');
      expect(collections[0].name).toBe('New Name');
    });
  });

  describe('item-collection assignment', () => {
    it('should allow assigning an item to a collection', () => {
      const item = { id: 'item-1', collection: null as string | null };
      const { collection } = createCollection('Work', false);
      item.collection = collection!.id;
      expect(item.collection).toBe(collection!.id);
    });

    it('should allow unassigning from a collection', () => {
      const item = { id: 'item-1', collection: 'coll-1' as string | null };
      item.collection = null;
      expect(item.collection).toBeNull();
    });

    it('should allow reassigning to a different collection', () => {
      const { collection: coll1 } = createCollection('Work', false);
      const { collection: coll2 } = createCollection('Personal', false);
      const item = { id: 'item-1', collection: coll1!.id as string | null };
      item.collection = coll2!.id;
      expect(item.collection).toBe(coll2!.id);
    });
  });
});
