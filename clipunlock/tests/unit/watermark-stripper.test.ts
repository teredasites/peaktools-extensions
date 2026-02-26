import '../setup';

// Watermark character definitions
const WATERMARK_CHARS: Record<string, RegExp> = {
  'zero-width-space': /\u200B/g,
  'zero-width-non-joiner': /\u200C/g,
  'zero-width-joiner': /\u200D/g,
  'left-to-right-mark': /\u200E/g,
  'right-to-left-mark': /\u200F/g,
  'word-joiner': /\u2060/g,
  'zero-width-no-break-space': /\uFEFF/g,
  'invisible-separator': /\u2063/g,
  'invisible-times': /\u2062/g,
  'invisible-plus': /\u2064/g,
  'function-application': /\u2061/g,
};

const ALL_WATERMARK_REGEX = /[\u200B\u200C\u200D\u200E\u200F\u2060\uFEFF\u2061\u2062\u2063\u2064]/g;

function stripWatermarks(text: string): string {
  return text.replace(ALL_WATERMARK_REGEX, '');
}

function hasWatermarks(text: string): boolean {
  return ALL_WATERMARK_REGEX.test(text);
}

function describeStrippedChars(original: string, cleaned: string): string[] {
  const found: string[] = [];
  for (const [name, regex] of Object.entries(WATERMARK_CHARS)) {
    // Reset regex lastIndex
    regex.lastIndex = 0;
    if (regex.test(original)) {
      found.push(name);
    }
    regex.lastIndex = 0;
  }
  return found;
}

// Tests
describe('WatermarkStripper', () => {
  describe('stripWatermarks', () => {
    it('should strip zero-width-space (U+200B)', () => {
      expect(stripWatermarks('hel\u200Blo')).toBe('hello');
    });

    it('should strip zero-width-non-joiner (U+200C)', () => {
      expect(stripWatermarks('hel\u200Clo')).toBe('hello');
    });

    it('should strip zero-width-joiner (U+200D)', () => {
      expect(stripWatermarks('hel\u200Dlo')).toBe('hello');
    });

    it('should strip left-to-right-mark (U+200E)', () => {
      expect(stripWatermarks('hel\u200Elo')).toBe('hello');
    });

    it('should strip right-to-left-mark (U+200F)', () => {
      expect(stripWatermarks('hel\u200Flo')).toBe('hello');
    });

    it('should strip word-joiner (U+2060)', () => {
      expect(stripWatermarks('hel\u2060lo')).toBe('hello');
    });

    it('should strip zero-width-no-break-space / BOM (U+FEFF)', () => {
      expect(stripWatermarks('hel\uFEFFlo')).toBe('hello');
    });

    it('should strip invisible-separator (U+2063)', () => {
      expect(stripWatermarks('hel\u2063lo')).toBe('hello');
    });

    it('should strip invisible-times (U+2062)', () => {
      expect(stripWatermarks('hel\u2062lo')).toBe('hello');
    });

    it('should strip invisible-plus (U+2064)', () => {
      expect(stripWatermarks('hel\u2064lo')).toBe('hello');
    });

    it('should strip function-application (U+2061)', () => {
      expect(stripWatermarks('hel\u2061lo')).toBe('hello');
    });

    it('should strip multiple simultaneous watermark types', () => {
      const watermarked = 'h\u200Be\u200Cl\u200Dl\u200Eo\u200F \u2060w\uFEFFo\u2061r\u2062l\u2063d\u2064!';
      expect(stripWatermarks(watermarked)).toBe('hello world!');
    });

    it('should return clean text unchanged', () => {
      const clean = 'Hello, World! This is clean text.';
      expect(stripWatermarks(clean)).toBe(clean);
    });

    it('should handle empty string', () => {
      expect(stripWatermarks('')).toBe('');
    });

    it('should preserve emojis', () => {
      const text = 'Hello \u200B\uD83D\uDE00 World';
      const result = stripWatermarks(text);
      expect(result).toContain('\uD83D\uDE00');
      expect(result).toBe('Hello \uD83D\uDE00 World');
    });

    it('should handle heavy watermarking', () => {
      // Every character surrounded by watermarks
      const chars = 'test';
      let heavy = '';
      for (const c of chars) {
        heavy += '\u200B\u200C\u200D' + c;
      }
      heavy += '\u200B\u200C\u200D';
      expect(stripWatermarks(heavy)).toBe('test');
    });
  });

  describe('hasWatermarks', () => {
    it('should return true when watermarks present', () => {
      expect(hasWatermarks('hel\u200Blo')).toBe(true);
    });

    it('should return false for clean text', () => {
      // Need to reset the regex since it uses /g flag
      ALL_WATERMARK_REGEX.lastIndex = 0;
      expect(hasWatermarks('hello')).toBe(false);
    });
  });

  describe('describeStrippedChars', () => {
    it('should identify which watermark types were found', () => {
      const original = 'hel\u200B\u200Clo';
      const cleaned = stripWatermarks(original);
      const types = describeStrippedChars(original, cleaned);
      expect(types).toContain('zero-width-space');
      expect(types).toContain('zero-width-non-joiner');
      expect(types).not.toContain('word-joiner');
    });
  });
});
