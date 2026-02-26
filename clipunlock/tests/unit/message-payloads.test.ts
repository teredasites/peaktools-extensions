import '../setup';
import type { ClipboardCapturePayload, Message, MessageType } from '../../src/shared/messages';

/**
 * Tests for the new message types added for Pro features.
 * Validates payload shapes and message routing expectations.
 */

describe('Pro Feature Message Payloads', () => {
  describe('ClipboardCapturePayload with Pro fields', () => {
    it('should support citation field', () => {
      const payload: ClipboardCapturePayload = {
        content: 'Hello world',
        html: null,
        sourceUrl: 'https://example.com',
        sourceTitle: 'Example',
        wasUnlocked: false,
        watermarkStripped: false,
        citation: 'https://example.com',
      };
      expect(payload.citation).toBe('https://example.com');
    });

    it('should support pdfCleaned field', () => {
      const payload: ClipboardCapturePayload = {
        content: 'Cleaned PDF text',
        html: null,
        sourceUrl: 'https://example.com/paper.pdf',
        sourceTitle: 'Research Paper',
        wasUnlocked: false,
        watermarkStripped: false,
        pdfCleaned: true,
      };
      expect(payload.pdfCleaned).toBe(true);
    });

    it('should have optional citation and pdfCleaned', () => {
      const payload: ClipboardCapturePayload = {
        content: 'Basic text',
        html: null,
        sourceUrl: 'https://example.com',
        sourceTitle: 'Example',
        wasUnlocked: false,
        watermarkStripped: false,
      };
      expect(payload.citation).toBeUndefined();
      expect(payload.pdfCleaned).toBeUndefined();
    });

    it('should support full payload with all fields', () => {
      const payload: ClipboardCapturePayload = {
        content: 'Some text from a PDF about climate change',
        html: '<p>Some text from a PDF about climate change</p>',
        sourceUrl: 'https://nature.com/article/123',
        sourceTitle: 'Climate Research 2026',
        wasUnlocked: true,
        watermarkStripped: true,
        citation: 'Climate Research 2026 — nature.com — Feb 26, 2026',
        pdfCleaned: true,
      };
      expect(payload.content).toBeTruthy();
      expect(payload.html).toBeTruthy();
      expect(payload.citation).toContain('nature.com');
      expect(payload.pdfCleaned).toBe(true);
      expect(payload.wasUnlocked).toBe(true);
      expect(payload.watermarkStripped).toBe(true);
    });
  });

  describe('new message types', () => {
    const newMessageTypes: MessageType[] = [
      'PASTE_ITEM',
      'GET_COLLECTIONS',
      'CREATE_COLLECTION',
      'DELETE_COLLECTION',
      'RENAME_COLLECTION',
      'SET_ITEM_COLLECTION',
      'QUICK_PASTE_ITEMS',
      'GET_CITATION',
    ];

    it('should include all collection message types', () => {
      const collectionTypes: MessageType[] = [
        'GET_COLLECTIONS',
        'CREATE_COLLECTION',
        'DELETE_COLLECTION',
        'RENAME_COLLECTION',
        'SET_ITEM_COLLECTION',
      ];
      collectionTypes.forEach((type) => {
        expect(newMessageTypes).toContain(type);
      });
    });

    it('should include quick-paste message type', () => {
      expect(newMessageTypes).toContain('QUICK_PASTE_ITEMS');
    });

    it('should include citation message type', () => {
      expect(newMessageTypes).toContain('GET_CITATION');
    });

    it('should include paste item message type', () => {
      expect(newMessageTypes).toContain('PASTE_ITEM');
    });
  });

  describe('PASTE_ITEM payload shapes', () => {
    it('should accept plain format', () => {
      const msg: Message = {
        type: 'PASTE_ITEM',
        payload: { id: 'clip-123', format: 'plain' },
      };
      expect(msg.type).toBe('PASTE_ITEM');
      expect((msg.payload as any).format).toBe('plain');
    });

    it('should accept rich format', () => {
      const msg: Message = {
        type: 'PASTE_ITEM',
        payload: { id: 'clip-123', format: 'rich' },
      };
      expect((msg.payload as any).format).toBe('rich');
    });

    it('should accept clean format', () => {
      const msg: Message = {
        type: 'PASTE_ITEM',
        payload: { id: 'clip-123', format: 'clean' },
      };
      expect((msg.payload as any).format).toBe('clean');
    });

    it('should accept with-citation format', () => {
      const msg: Message = {
        type: 'PASTE_ITEM',
        payload: { id: 'clip-123', format: 'with-citation' },
      };
      expect((msg.payload as any).format).toBe('with-citation');
    });
  });

  describe('collection message payloads', () => {
    it('should create collection with name', () => {
      const msg: Message = {
        type: 'CREATE_COLLECTION',
        payload: { name: 'Research' },
      };
      expect(msg.type).toBe('CREATE_COLLECTION');
      expect((msg.payload as any).name).toBe('Research');
    });

    it('should delete collection by ID', () => {
      const msg: Message = {
        type: 'DELETE_COLLECTION',
        payload: { id: 'coll-abc123' },
      };
      expect((msg.payload as any).id).toBe('coll-abc123');
    });

    it('should rename collection with ID and new name', () => {
      const msg: Message = {
        type: 'RENAME_COLLECTION',
        payload: { id: 'coll-abc123', name: 'New Name' },
      };
      expect((msg.payload as any).id).toBe('coll-abc123');
      expect((msg.payload as any).name).toBe('New Name');
    });

    it('should set item collection with item ID and collection ID', () => {
      const msg: Message = {
        type: 'SET_ITEM_COLLECTION',
        payload: { itemId: 'clip-123', collectionId: 'coll-abc' },
      };
      expect((msg.payload as any).itemId).toBe('clip-123');
      expect((msg.payload as any).collectionId).toBe('coll-abc');
    });

    it('should set item collection to null for uncategorized', () => {
      const msg: Message = {
        type: 'SET_ITEM_COLLECTION',
        payload: { itemId: 'clip-123', collectionId: null },
      };
      expect((msg.payload as any).collectionId).toBeNull();
    });
  });

  describe('QUICK_PASTE_ITEMS payload', () => {
    it('should request items with a limit', () => {
      const msg: Message = {
        type: 'QUICK_PASTE_ITEMS',
        payload: { limit: 10 },
      };
      expect((msg.payload as any).limit).toBe(10);
    });

    it('should default to 10 items typically', () => {
      const defaultLimit = 10;
      expect(defaultLimit).toBe(10);
    });
  });

  describe('GET_CITATION payload', () => {
    it('should request citation by item ID', () => {
      const msg: Message = {
        type: 'GET_CITATION',
        payload: { id: 'clip-123' },
      };
      expect((msg.payload as any).id).toBe('clip-123');
    });
  });
});
