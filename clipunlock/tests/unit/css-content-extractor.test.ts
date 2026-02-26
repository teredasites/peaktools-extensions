import '../setup';

// CSS Content Extractor functions
function extractCSSContent(element: HTMLElement): string {
  const before = window.getComputedStyle(element, '::before').content;
  const after = window.getComputedStyle(element, '::after').content;

  let result = '';

  if (before && before !== 'none' && before !== '""' && before !== "''") {
    result += stripQuotes(before);
  }

  result += element.textContent || '';

  if (after && after !== 'none' && after !== '""' && after !== "''") {
    result += stripQuotes(after);
  }

  return result;
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function hasSignificantCSSContent(element: HTMLElement): boolean {
  const before = window.getComputedStyle(element, '::before').content;
  const after = window.getComputedStyle(element, '::after').content;

  const isSignificant = (val: string | null): boolean => {
    if (!val || val === 'none' || val === '""' || val === "''") return false;
    const stripped = stripQuotes(val).trim();
    // Ignore purely decorative content (single chars like bullets, arrows)
    return stripped.length > 1;
  };

  return isSignificant(before) || isSignificant(after);
}

// Tests
describe('CSSContentExtractor', () => {
  describe('extractCSSContent', () => {
    it('should extract plain element text content', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello World';
      const result = extractCSSContent(el);
      expect(result).toContain('Hello World');
    });

    it('should handle empty content', () => {
      const el = document.createElement('div');
      el.textContent = '';
      const result = extractCSSContent(el);
      // In JSDOM, getComputedStyle for pseudo-elements returns empty
      expect(result).toBe('');
    });

    it('should handle none pseudo-elements', () => {
      const el = document.createElement('span');
      el.textContent = 'test';
      // JSDOM returns empty string for pseudo content, which we treat as absent
      const result = extractCSSContent(el);
      expect(result).toBe('test');
    });
  });

  describe('hasSignificantCSSContent', () => {
    it('should return false when no pseudo-element content exists', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello';
      // JSDOM pseudo-elements always return empty content
      expect(hasSignificantCSSContent(el)).toBe(false);
    });

    it('should return false for none content', () => {
      const el = document.createElement('div');
      expect(hasSignificantCSSContent(el)).toBe(false);
    });
  });

  describe('stripQuotes', () => {
    it('should strip double quotes', () => {
      expect(stripQuotes('"hello"')).toBe('hello');
    });

    it('should strip single quotes', () => {
      expect(stripQuotes("'hello'")).toBe('hello');
    });

    it('should leave unquoted values unchanged', () => {
      expect(stripQuotes('hello')).toBe('hello');
    });
  });
});
