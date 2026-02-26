import '../setup';

// Clipboard store with eviction
interface ClipItem {
  id: string;
  text: string;
  preview: string;
  type: string;
  timestamp: number;
  pinned: boolean;
}

class ClipboardStore {
  private items: ClipItem[] = [];
  private maxItems: number;

  constructor(maxItems: number = 500) {
    this.maxItems = maxItems;
  }

  add(item: ClipItem): void {
    this.items.unshift(item);
    this.evict();
  }

  getAll(): ClipItem[] {
    return [...this.items];
  }

  getCount(): number {
    return this.items.length;
  }

  pin(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) item.pinned = true;
  }

  unpin(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) item.pinned = false;
  }

  delete(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
  }

  clear(): void {
    // Keep pinned items
    this.items = this.items.filter((i) => i.pinned);
  }

  private evict(): void {
    if (this.items.length <= this.maxItems) return;

    // Sort: pinned items first, then by timestamp
    const pinned = this.items.filter((i) => i.pinned);
    const unpinned = this.items.filter((i) => !i.pinned);

    // Keep all pinned + newest unpinned up to maxItems
    const remainingSlots = Math.max(0, this.maxItems - pinned.length);
    const keptUnpinned = unpinned.slice(0, remainingSlots);

    this.items = [...pinned, ...keptUnpinned];
  }
}

function createItem(index: number, pinned: boolean = false): ClipItem {
  return {
    id: `item-${index}`,
    text: `Item content ${index}`,
    preview: `Item ${index}`,
    type: 'text',
    timestamp: Date.now() - index * 1000,
    pinned,
  };
}

describe('Chaos Test - Storage Overflow', () => {
  describe('eviction logic', () => {
    it('should evict oldest items when exceeding max', () => {
      const store = new ClipboardStore(10);

      // Add 20 items
      for (let i = 0; i < 20; i++) {
        store.add(createItem(i));
      }

      expect(store.getCount()).toBe(10);
    });

    it('should keep items at max limit after many additions', () => {
      const store = new ClipboardStore(100);

      for (let i = 0; i < 1000; i++) {
        store.add(createItem(i));
      }

      expect(store.getCount()).toBe(100);
    });

    it('should never evict pinned items', () => {
      const store = new ClipboardStore(5);

      // Add 3 pinned items
      for (let i = 0; i < 3; i++) {
        store.add(createItem(i, true));
      }

      // Add 10 unpinned items
      for (let i = 3; i < 13; i++) {
        store.add(createItem(i, false));
      }

      const allItems = store.getAll();
      const pinnedItems = allItems.filter((i) => i.pinned);

      // All 3 pinned items should still exist
      expect(pinnedItems).toHaveLength(3);
    });

    it('should keep pinned items even when they exceed max', () => {
      const store = new ClipboardStore(5);

      // Add 8 pinned items (exceeds max of 5)
      for (let i = 0; i < 8; i++) {
        store.add(createItem(i, true));
      }

      const allItems = store.getAll();
      // All 8 pinned items should be kept even though max is 5
      expect(allItems).toHaveLength(8);
      expect(allItems.every((i) => i.pinned)).toBe(true);
    });

    it('should evict unpinned items before pinned when at capacity', () => {
      const store = new ClipboardStore(5);

      // Add 2 pinned
      store.add(createItem(1, true));
      store.add(createItem(2, true));

      // Add 10 unpinned
      for (let i = 3; i < 13; i++) {
        store.add(createItem(i, false));
      }

      const allItems = store.getAll();
      const pinnedCount = allItems.filter((i) => i.pinned).length;
      const unpinnedCount = allItems.filter((i) => !i.pinned).length;

      expect(pinnedCount).toBe(2);
      expect(unpinnedCount).toBe(3); // 5 max - 2 pinned = 3 unpinned slots
    });

    it('should handle clear preserving pinned items', () => {
      const store = new ClipboardStore(100);

      // Add mixed items
      for (let i = 0; i < 50; i++) {
        store.add(createItem(i, i % 5 === 0)); // Every 5th item is pinned
      }

      store.clear();

      const allItems = store.getAll();
      expect(allItems.every((i) => i.pinned)).toBe(true);
      expect(allItems.length).toBeGreaterThan(0);
    });

    it('should handle large-scale stress test', () => {
      const store = new ClipboardStore(500);

      expect(() => {
        for (let i = 0; i < 10000; i++) {
          store.add(createItem(i, i % 100 === 0));
        }
      }).not.toThrow();

      const allItems = store.getAll();
      const pinnedItems = allItems.filter((i) => i.pinned);

      // Should have kept all pinned items that were added
      expect(pinnedItems.length).toBeGreaterThan(0);
      // Total should not exceed max + pinned overflow
      expect(allItems.length).toBeLessThanOrEqual(500 + pinnedItems.length);
    });

    it('should handle delete during overflow', () => {
      const store = new ClipboardStore(10);

      for (let i = 0; i < 20; i++) {
        store.add(createItem(i));
      }

      expect(store.getCount()).toBe(10);

      // Items are unshifted (newest first), so after eviction items 0-9 are kept
      // (they were added first but unshift puts them at front, eviction keeps first N)
      // Delete two items that are actually in the store
      const existingIds = store.getAll().map((i) => i.id);
      store.delete(existingIds[0]);
      store.delete(existingIds[1]);

      expect(store.getCount()).toBe(8);
    });
  });
});
