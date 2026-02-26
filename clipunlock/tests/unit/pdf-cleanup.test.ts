import '../setup';
import { detectPdfFormatting, cleanPdfLineBreaks } from '../../src/shared/pdf-cleanup';

describe('PDF Line Break Cleanup', () => {
  describe('detectPdfFormatting', () => {
    it('should return false for empty or short text', () => {
      expect(detectPdfFormatting('')).toBe(false);
      expect(detectPdfFormatting('short')).toBe(false);
      expect(detectPdfFormatting('a'.repeat(49))).toBe(false);
    });

    it('should return false for text with fewer than 3 lines', () => {
      expect(detectPdfFormatting('line one\nline two')).toBe(false);
    });

    it('should detect PDF-style mid-sentence line breaks', () => {
      // Classic PDF column wrapping — lines end mid-sentence, next starts lowercase
      const pdfText = `This is a research paper about the effects of
climate change on coastal ecosystems and
how rising sea levels threaten communities
that depend on fishing for their primary
source of income and livelihood.

The second paragraph discusses potential
mitigation strategies that governments
can implement to reduce the impact.`;
      expect(detectPdfFormatting(pdfText)).toBe(true);
    });

    it('should detect hyphenated word breaks', () => {
      const pdfText = `This paper presents a comprehen-
sive analysis of the socioeco-
nomic factors that contribute to
regional development patterns.

The methodology uses quantita-
tive approaches combined with
qualitative interviews.`;
      expect(detectPdfFormatting(pdfText)).toBe(true);
    });

    it('should return false for normal text with paragraph breaks', () => {
      const normalText = `This is a normal paragraph that ends properly.

This is another paragraph that also ends properly.

And a third paragraph here with normal formatting.`;
      expect(detectPdfFormatting(normalText)).toBe(false);
    });

    it('should return false for list items', () => {
      const listText = `Shopping list:
- Apples
- Bananas
- Oranges
- Milk
- Bread`;
      expect(detectPdfFormatting(listText)).toBe(false);
    });
  });

  describe('cleanPdfLineBreaks', () => {
    it('should join mid-sentence line breaks with spaces', () => {
      const input = `This is a research paper about the effects of
climate change on coastal ecosystems and
how rising sea levels threaten communities.`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('effects of climate change');
      expect(result).toContain('ecosystems and how');
      expect(result).not.toContain('\n');
    });

    it('should rejoin hyphenated words', () => {
      const input = `This paper presents a comprehen-
sive analysis of the socioeco-
nomic factors.`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('comprehensive');
      expect(result).toContain('socioeconomic');
    });

    it('should preserve paragraph breaks (double newlines)', () => {
      const input = `First paragraph about topic one
that continues on the next line.

Second paragraph about topic two
that also continues.`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('topic one that continues');
      expect(result).toContain('\n\n');
      expect(result.split('\n\n').length).toBe(2);
    });

    it('should preserve list items', () => {
      const input = `The following items were found:
- Item one
- Item two
- Item three`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('- Item one');
      expect(result).toContain('- Item two');
      expect(result).toContain('- Item three');
    });

    it('should preserve numbered list items', () => {
      const input = `Steps in the process:
1. First step
2. Second step
3. Third step`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('1. First step');
      expect(result).toContain('2. Second step');
    });

    it('should preserve headers', () => {
      const input = `Introduction

This section covers the basics of
our research methodology and how
we collected data.

Conclusion

The results show significant
improvement.`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('Introduction');
      expect(result).toContain('Conclusion');
    });

    it('should handle empty input', () => {
      expect(cleanPdfLineBreaks('')).toBe('');
    });

    it('should handle single line input', () => {
      const input = 'Single line of text.';
      expect(cleanPdfLineBreaks(input)).toBe('Single line of text.');
    });

    it('should handle bullet points with unicode characters', () => {
      const input = `Key findings:
\u2022 First finding
\u2022 Second finding
\u2022 Third finding`;
      const result = cleanPdfLineBreaks(input);
      expect(result).toContain('\u2022 First finding');
      expect(result).toContain('\u2022 Second finding');
    });
  });
});
