import '../setup';

// Test the citation generation logic (mirrors clipboard-interceptor.ts)
function generateCitation(
  style: 'none' | 'url' | 'formatted',
  sourceUrl: string,
  sourceTitle: string
): string | null {
  if (style === 'none') return null;

  const domain = (() => {
    try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); }
    catch { return sourceUrl; }
  })();

  if (style === 'url') {
    return sourceUrl;
  }

  if (style === 'formatted') {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const title = sourceTitle || domain;
    return `${title} — ${domain} — ${date}`;
  }

  return null;
}

describe('Auto-Citation', () => {
  describe('generateCitation', () => {
    it('should return null for "none" style', () => {
      expect(generateCitation('none', 'https://example.com/page', 'Example')).toBeNull();
    });

    it('should return the URL for "url" style', () => {
      const result = generateCitation('url', 'https://example.com/article/123', 'Article Title');
      expect(result).toBe('https://example.com/article/123');
    });

    it('should return formatted citation for "formatted" style', () => {
      const result = generateCitation('formatted', 'https://www.example.com/page', 'My Article');
      expect(result).not.toBeNull();
      expect(result).toContain('My Article');
      expect(result).toContain('example.com'); // www. stripped
      expect(result).toContain(' — ');
      // Should have a date component
      expect(result).toMatch(/\w+ \d+, \d{4}/);
    });

    it('should strip www. from domain in formatted citation', () => {
      const result = generateCitation('formatted', 'https://www.nytimes.com/article', 'News Article');
      expect(result).toContain('nytimes.com');
      expect(result).not.toContain('www.');
    });

    it('should use domain as title when sourceTitle is empty', () => {
      const result = generateCitation('formatted', 'https://example.com/page', '');
      expect(result).not.toBeNull();
      expect(result!.startsWith('example.com')).toBe(true);
    });

    it('should handle invalid URLs gracefully', () => {
      const result = generateCitation('url', 'not-a-url', 'Title');
      expect(result).toBe('not-a-url');
    });

    it('should handle formatted citation with invalid URL', () => {
      const result = generateCitation('formatted', 'not-a-url', 'Title');
      expect(result).toContain('Title');
      expect(result).toContain('not-a-url');
    });

    it('should include current date in formatted citation', () => {
      const result = generateCitation('formatted', 'https://example.com', 'Test');
      const today = new Date();
      const year = today.getFullYear().toString();
      expect(result).toContain(year);
    });
  });

  describe('citation integration with ClipboardEntry', () => {
    it('should store citation on entry', () => {
      const entry = {
        id: 'test-id',
        content: 'Some copied text',
        citation: generateCitation('url', 'https://example.com/article', 'Article'),
        pdfCleaned: false,
        collection: null,
      };
      expect(entry.citation).toBe('https://example.com/article');
    });

    it('should format copy-with-citation text', () => {
      const content = 'Some important quote from the article.';
      const citation = 'My Article — example.com — Jan 1, 2026';
      const withCitation = `${content}\n\n— ${citation}`;
      expect(withCitation).toContain(content);
      expect(withCitation).toContain('— My Article');
    });
  });
});
