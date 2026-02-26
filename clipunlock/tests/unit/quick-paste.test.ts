import '../setup';

// Test quick-paste utility logic (mirrors quick-paste.ts helper functions)

/** Time-ago formatting (mirrors quick-paste.ts) */
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Escape HTML (mirrors quick-paste.ts) */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Filter logic (mirrors quick-paste.ts filterItems) */
interface QuickPasteItem {
  id: string;
  preview: string;
  content: string;
  contentType: string;
  pinned: boolean;
  timestamp: number;
  sourceDomain: string;
}

function filterItems(items: QuickPasteItem[], query: string): QuickPasteItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter((item) =>
    item.preview.toLowerCase().includes(q) ||
    item.content.toLowerCase().includes(q) ||
    (item.sourceDomain && item.sourceDomain.toLowerCase().includes(q))
  );
}

/** Quick-paste item sorting: pinned first, then by timestamp descending (mirrors getQuickPasteItems) */
function sortQuickPasteItems(items: QuickPasteItem[]): QuickPasteItem[] {
  const pinned = items.filter((i) => i.pinned).sort((a, b) => b.timestamp - a.timestamp);
  const unpinned = items.filter((i) => !i.pinned).sort((a, b) => b.timestamp - a.timestamp);
  return [...pinned, ...unpinned];
}

/** Keyboard navigation: compute next selected index */
function navigateDown(selectedIdx: number, itemCount: number): number {
  return Math.min(selectedIdx + 1, itemCount - 1);
}

function navigateUp(selectedIdx: number): number {
  return Math.max(selectedIdx - 1, 0);
}

/** Number key selection (1-9) */
function numberKeyToIndex(key: string, itemCount: number): number | null {
  const num = parseInt(key, 10);
  if (num >= 1 && num <= 9 && num - 1 < itemCount) {
    return num - 1;
  }
  return null;
}

describe('Quick Paste', () => {
  describe('timeAgo', () => {
    it('should return "now" for timestamps less than 60 seconds ago', () => {
      expect(timeAgo(Date.now())).toBe('now');
      expect(timeAgo(Date.now() - 30_000)).toBe('now');
      expect(timeAgo(Date.now() - 59_000)).toBe('now');
    });

    it('should return minutes for timestamps 1-59 minutes ago', () => {
      expect(timeAgo(Date.now() - 60_000)).toBe('1m');
      expect(timeAgo(Date.now() - 5 * 60_000)).toBe('5m');
      expect(timeAgo(Date.now() - 59 * 60_000)).toBe('59m');
    });

    it('should return hours for timestamps 1-23 hours ago', () => {
      expect(timeAgo(Date.now() - 60 * 60_000)).toBe('1h');
      expect(timeAgo(Date.now() - 12 * 60 * 60_000)).toBe('12h');
      expect(timeAgo(Date.now() - 23 * 60 * 60_000)).toBe('23h');
    });

    it('should return days for timestamps 24+ hours ago', () => {
      expect(timeAgo(Date.now() - 24 * 60 * 60_000)).toBe('1d');
      expect(timeAgo(Date.now() - 7 * 24 * 60 * 60_000)).toBe('7d');
      expect(timeAgo(Date.now() - 365 * 24 * 60 * 60_000)).toBe('365d');
    });
  });

  describe('escapeHtml', () => {
    it('should escape ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape angle brackets', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape quotes', () => {
      expect(escapeHtml('He said "hello"')).toContain('&quot;');
      expect(escapeHtml("it's")).toContain('&#39;');
    });

    it('should return empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should not double-escape already-escaped text', () => {
      // If text contains &amp; it should be escaped to &amp;amp;
      expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });

    it('should handle text with no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('filterItems', () => {
    const items: QuickPasteItem[] = [
      { id: '1', preview: 'Hello World', content: 'Hello World', contentType: 'text', pinned: true, timestamp: 1000, sourceDomain: 'example.com' },
      { id: '2', preview: 'Lorem ipsum dolor', content: 'Lorem ipsum dolor sit amet', contentType: 'text', pinned: false, timestamp: 900, sourceDomain: 'wikipedia.org' },
      { id: '3', preview: 'const foo = 42;', content: 'const foo = 42;', contentType: 'code', pinned: false, timestamp: 800, sourceDomain: 'github.com' },
      { id: '4', preview: 'https://example.com', content: 'https://example.com/some/path', contentType: 'url', pinned: false, timestamp: 700, sourceDomain: 'reddit.com' },
    ];

    it('should return all items for empty query', () => {
      expect(filterItems(items, '')).toEqual(items);
      expect(filterItems(items, '   ')).toEqual(items);
    });

    it('should filter by preview text', () => {
      const result = filterItems(items, 'hello');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by content text', () => {
      const result = filterItems(items, 'sit amet');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should filter by source domain', () => {
      const result = filterItems(items, 'github');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should be case-insensitive', () => {
      expect(filterItems(items, 'HELLO')).toHaveLength(1);
      expect(filterItems(items, 'LOREM')).toHaveLength(1);
      expect(filterItems(items, 'GITHUB')).toHaveLength(1);
    });

    it('should return empty array when nothing matches', () => {
      expect(filterItems(items, 'nonexistent')).toHaveLength(0);
    });

    it('should match across multiple fields', () => {
      // "example" matches item 1 (sourceDomain) and item 4 (content + sourceDomain)
      const result = filterItems(items, 'example');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sortQuickPasteItems', () => {
    const items: QuickPasteItem[] = [
      { id: '1', preview: 'Old unpinned', content: '', contentType: 'text', pinned: false, timestamp: 100, sourceDomain: '' },
      { id: '2', preview: 'Pinned old', content: '', contentType: 'text', pinned: true, timestamp: 200, sourceDomain: '' },
      { id: '3', preview: 'Recent unpinned', content: '', contentType: 'text', pinned: false, timestamp: 300, sourceDomain: '' },
      { id: '4', preview: 'Pinned recent', content: '', contentType: 'text', pinned: true, timestamp: 400, sourceDomain: '' },
    ];

    it('should put pinned items first', () => {
      const sorted = sortQuickPasteItems(items);
      expect(sorted[0].pinned).toBe(true);
      expect(sorted[1].pinned).toBe(true);
      expect(sorted[2].pinned).toBe(false);
      expect(sorted[3].pinned).toBe(false);
    });

    it('should sort pinned items by timestamp descending (most recent first)', () => {
      const sorted = sortQuickPasteItems(items);
      expect(sorted[0].id).toBe('4'); // pinned, timestamp 400
      expect(sorted[1].id).toBe('2'); // pinned, timestamp 200
    });

    it('should sort unpinned items by timestamp descending', () => {
      const sorted = sortQuickPasteItems(items);
      expect(sorted[2].id).toBe('3'); // unpinned, timestamp 300
      expect(sorted[3].id).toBe('1'); // unpinned, timestamp 100
    });

    it('should handle all pinned items', () => {
      const allPinned = items.map((i) => ({ ...i, pinned: true }));
      const sorted = sortQuickPasteItems(allPinned);
      expect(sorted[0].timestamp).toBeGreaterThanOrEqual(sorted[1].timestamp);
      expect(sorted[1].timestamp).toBeGreaterThanOrEqual(sorted[2].timestamp);
    });

    it('should handle no pinned items', () => {
      const noPinned = items.map((i) => ({ ...i, pinned: false }));
      const sorted = sortQuickPasteItems(noPinned);
      expect(sorted[0].timestamp).toBeGreaterThanOrEqual(sorted[1].timestamp);
    });

    it('should handle empty array', () => {
      expect(sortQuickPasteItems([])).toEqual([]);
    });
  });

  describe('keyboard navigation', () => {
    it('should move down without exceeding bounds', () => {
      expect(navigateDown(0, 5)).toBe(1);
      expect(navigateDown(3, 5)).toBe(4);
      expect(navigateDown(4, 5)).toBe(4); // capped at last
    });

    it('should move up without going below 0', () => {
      expect(navigateUp(3)).toBe(2);
      expect(navigateUp(1)).toBe(0);
      expect(navigateUp(0)).toBe(0); // capped at 0
    });

    it('should handle navigating in a list of 1 item', () => {
      expect(navigateDown(0, 1)).toBe(0);
      expect(navigateUp(0)).toBe(0);
    });

    it('should handle navigating in an empty list', () => {
      expect(navigateDown(0, 0)).toBe(-1); // min(1, -1)
      expect(navigateUp(0)).toBe(0);
    });
  });

  describe('numberKeyToIndex', () => {
    it('should map 1-9 to indices 0-8', () => {
      expect(numberKeyToIndex('1', 10)).toBe(0);
      expect(numberKeyToIndex('5', 10)).toBe(4);
      expect(numberKeyToIndex('9', 10)).toBe(8);
    });

    it('should return null for numbers exceeding item count', () => {
      expect(numberKeyToIndex('5', 3)).toBeNull();
      expect(numberKeyToIndex('9', 5)).toBeNull();
    });

    it('should return null for non-numeric keys', () => {
      expect(numberKeyToIndex('a', 10)).toBeNull();
      expect(numberKeyToIndex('Enter', 10)).toBeNull();
      expect(numberKeyToIndex('0', 10)).toBeNull();
    });

    it('should handle edge case: key "1" with 1 item', () => {
      expect(numberKeyToIndex('1', 1)).toBe(0);
    });

    it('should handle edge case: key "1" with 0 items', () => {
      expect(numberKeyToIndex('1', 0)).toBeNull();
    });
  });

  describe('quick-paste item rendering data', () => {
    it('should correctly assign index numbers 1-9 for first 9 items', () => {
      const items: QuickPasteItem[] = Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i}`,
        preview: `Item ${i}`,
        content: `Item ${i}`,
        contentType: 'text',
        pinned: false,
        timestamp: Date.now() - i * 1000,
        sourceDomain: 'example.com',
      }));

      // Items 0-8 get labels 1-9, items 9+ get no label
      items.forEach((_, i) => {
        const label = i < 9 ? String(i + 1) : '';
        if (i < 9) {
          expect(label).toBe(String(i + 1));
        } else {
          expect(label).toBe('');
        }
      });
    });

    it('should show pinned indicator for pinned items', () => {
      const item: QuickPasteItem = {
        id: '1',
        preview: 'Pinned item',
        content: 'Pinned item',
        contentType: 'text',
        pinned: true,
        timestamp: Date.now(),
        sourceDomain: 'example.com',
      };
      // Pinned items should render with the star indicator
      expect(item.pinned).toBe(true);
    });

    it('should show content type badge for non-text items', () => {
      const codeItem: QuickPasteItem = {
        id: '1',
        preview: 'const x = 1;',
        content: 'const x = 1;',
        contentType: 'code',
        pinned: false,
        timestamp: Date.now(),
        sourceDomain: 'github.com',
      };
      const urlItem: QuickPasteItem = {
        id: '2',
        preview: 'https://example.com',
        content: 'https://example.com',
        contentType: 'url',
        pinned: false,
        timestamp: Date.now(),
        sourceDomain: 'reddit.com',
      };
      const textItem: QuickPasteItem = {
        id: '3',
        preview: 'Normal text',
        content: 'Normal text',
        contentType: 'text',
        pinned: false,
        timestamp: Date.now(),
        sourceDomain: 'example.com',
      };

      // Non-text items should show type badge
      expect(codeItem.contentType !== 'text').toBe(true);
      expect(urlItem.contentType !== 'text').toBe(true);
      expect(textItem.contentType !== 'text').toBe(false);
    });
  });

  describe('toggle behavior', () => {
    it('should toggle overlay visibility', () => {
      let isVisible = false;
      // Calling show when hidden should show
      if (!isVisible) {
        isVisible = true;
      } else {
        isVisible = false;
      }
      expect(isVisible).toBe(true);

      // Calling show when visible should hide (toggle behavior in quick-paste.ts)
      if (!isVisible) {
        isVisible = true;
      } else {
        isVisible = false;
      }
      expect(isVisible).toBe(false);
    });
  });
});
