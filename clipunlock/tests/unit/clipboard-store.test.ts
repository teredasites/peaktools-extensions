import '../setup';

// Content type detection
function detectContentType(text: string): string {
  // URL detection
  try {
    const url = new URL(text.trim());
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return 'url';
    }
  } catch {
    // Not a URL
  }

  // Email detection
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(text.trim())) {
    return 'email';
  }

  // Code detection heuristics
  const codeIndicators = [
    /^(import|export|const|let|var|function|class|interface|type)\s/m,
    /[{};]\s*$/m,
    /^\s*(if|else|for|while|switch|try|catch)\s*\(/m,
    /=>/,
    /\(\) =>/,
    /^(def |class |import |from |print\()/m,
    /<\/?[a-zA-Z][^>]*>/,
  ];

  let codeScore = 0;
  for (const indicator of codeIndicators) {
    if (indicator.test(text)) codeScore++;
  }
  if (codeScore >= 2) return 'code';

  return 'text';
}

// Preview generation
function generatePreview(text: string, maxLength: number = 80): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + '...';
}

// Word count
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Max item size check
const MAX_ITEM_SIZE = 100_000; // 100KB

function isWithinSizeLimit(text: string): boolean {
  return text.length <= MAX_ITEM_SIZE;
}

// Dedup window
function isDuplicate(
  text: string,
  recentItems: Array<{ text: string; timestamp: number }>,
  windowMs: number = 2000
): boolean {
  const now = Date.now();
  return recentItems.some(
    (item) => item.text === text && now - item.timestamp < windowMs
  );
}

// Tests
describe('ClipboardStore', () => {
  describe('content type detection', () => {
    it('should detect URLs', () => {
      expect(detectContentType('https://example.com/path?q=1')).toBe('url');
      expect(detectContentType('http://localhost:3000')).toBe('url');
    });

    it('should detect email addresses', () => {
      expect(detectContentType('user@example.com')).toBe('email');
    });

    it('should detect code snippets', () => {
      const jsCode = `const x = 5;
if (x > 3) {
  console.log(x);
}`;
      expect(detectContentType(jsCode)).toBe('code');
    });

    it('should detect plain text', () => {
      expect(detectContentType('Hello, this is a regular sentence.')).toBe('text');
    });

    it('should detect HTML as code', () => {
      // HTML with multiple tags matches /<\/?[a-zA-Z][^>]*>/ and /[{};]\s*$/m indicators
      expect(detectContentType('<div class="test">\n<p>Hello</p>;\n</div>')).toBe('code');
    });
  });

  describe('preview generation', () => {
    it('should return short text as-is', () => {
      expect(generatePreview('Hello world')).toBe('Hello world');
    });

    it('should truncate long text', () => {
      const longText = 'A'.repeat(100);
      const preview = generatePreview(longText);
      expect(preview.length).toBeLessThanOrEqual(80);
      expect(preview).toEndWith('...');
    });

    it('should collapse whitespace', () => {
      expect(generatePreview('Hello\n\n  World\t!')).toBe('Hello World !');
    });
  });

  describe('word count', () => {
    it('should count words correctly', () => {
      expect(wordCount('Hello world')).toBe(2);
      expect(wordCount('one two three four five')).toBe(5);
    });

    it('should handle multiple spaces', () => {
      expect(wordCount('Hello   world')).toBe(2);
    });

    it('should handle empty string', () => {
      expect(wordCount('')).toBe(0);
    });
  });

  describe('max item size', () => {
    it('should accept text within size limit', () => {
      expect(isWithinSizeLimit('Hello')).toBe(true);
    });

    it('should reject text exceeding size limit', () => {
      const huge = 'A'.repeat(MAX_ITEM_SIZE + 1);
      expect(isWithinSizeLimit(huge)).toBe(false);
    });
  });

  describe('dedup window', () => {
    it('should detect duplicate within window', () => {
      const recent = [{ text: 'hello', timestamp: Date.now() - 500 }];
      expect(isDuplicate('hello', recent)).toBe(true);
    });

    it('should not flag duplicate outside window', () => {
      const recent = [{ text: 'hello', timestamp: Date.now() - 5000 }];
      expect(isDuplicate('hello', recent)).toBe(false);
    });

    it('should not flag different text', () => {
      const recent = [{ text: 'hello', timestamp: Date.now() - 500 }];
      expect(isDuplicate('world', recent)).toBe(false);
    });
  });
});

// Custom matcher
expect.extend({
  toEndWith(received: string, expected: string) {
    const pass = received.endsWith(expected);
    return {
      message: () => `expected "${received}" to end with "${expected}"`,
      pass,
    };
  },
});

declare module 'vitest' {
  interface Assertion {
    toEndWith(expected: string): void;
  }
}
