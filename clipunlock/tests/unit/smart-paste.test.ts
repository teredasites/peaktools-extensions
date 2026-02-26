import '../setup';
import type { PasteFormat, CitationStyle } from '../../src/shared/types';

// Test smart paste format logic (mirrors service-worker.ts PASTE_ITEM handler)

/** Simulate formatting text for different paste modes */
function formatForPaste(
  content: string,
  html: string | null,
  format: PasteFormat,
  citation: string | null
): { text: string; html: string | null } {
  switch (format) {
    case 'plain':
      return { text: content, html: null };
    case 'rich':
      return { text: content, html: html ?? null };
    case 'clean': {
      // Clean paste: strip HTML tags, keep only text
      const cleaned = html ? stripHtmlTags(html) : content;
      return { text: cleaned, html: null };
    }
    case 'with-citation': {
      if (!citation) return { text: content, html: null };
      const withCite = `${content}\n\n— ${citation}`;
      return { text: withCite, html: null };
    }
    default:
      return { text: content, html: null };
  }
}

/** Strip HTML tags (basic, mirrors what the extension does) */
function stripHtmlTags(html: string): string {
  // Replace <br> and block-level tags with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Trim excess whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/** Generate a citation string for testing */
function generateCitation(
  style: CitationStyle,
  sourceUrl: string,
  sourceTitle: string
): string | null {
  if (style === 'none') return null;
  const domain = (() => {
    try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); }
    catch { return sourceUrl; }
  })();
  if (style === 'url') return sourceUrl;
  if (style === 'formatted') {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const title = sourceTitle || domain;
    return `${title} — ${domain} — ${date}`;
  }
  return null;
}

describe('Smart Paste', () => {
  const sampleText = 'The quick brown fox jumps over the lazy dog.';
  const sampleHtml = '<p>The <strong>quick brown</strong> fox jumps over the <em>lazy</em> dog.</p>';
  const sampleCitation = 'https://example.com/article';
  const formattedCitation = 'My Article — example.com — Feb 26, 2026';

  describe('formatForPaste', () => {
    it('should return plain text with no HTML for "plain" format', () => {
      const result = formatForPaste(sampleText, sampleHtml, 'plain', sampleCitation);
      expect(result.text).toBe(sampleText);
      expect(result.html).toBeNull();
    });

    it('should return text with HTML for "rich" format', () => {
      const result = formatForPaste(sampleText, sampleHtml, 'rich', sampleCitation);
      expect(result.text).toBe(sampleText);
      expect(result.html).toBe(sampleHtml);
    });

    it('should return null HTML when source has no HTML for "rich" format', () => {
      const result = formatForPaste(sampleText, null, 'rich', sampleCitation);
      expect(result.text).toBe(sampleText);
      expect(result.html).toBeNull();
    });

    it('should strip HTML tags for "clean" format', () => {
      const result = formatForPaste(sampleText, sampleHtml, 'clean', sampleCitation);
      expect(result.text).not.toContain('<strong>');
      expect(result.text).not.toContain('<em>');
      expect(result.text).not.toContain('<p>');
      expect(result.text).toContain('quick brown');
      expect(result.text).toContain('lazy');
      expect(result.html).toBeNull();
    });

    it('should fall back to plain content when "clean" has no HTML', () => {
      const result = formatForPaste(sampleText, null, 'clean', null);
      expect(result.text).toBe(sampleText);
      expect(result.html).toBeNull();
    });

    it('should append citation for "with-citation" format', () => {
      const result = formatForPaste(sampleText, sampleHtml, 'with-citation', sampleCitation);
      expect(result.text).toContain(sampleText);
      expect(result.text).toContain(`— ${sampleCitation}`);
      expect(result.text).toContain('\n\n');
      expect(result.html).toBeNull();
    });

    it('should not append citation when citation is null', () => {
      const result = formatForPaste(sampleText, sampleHtml, 'with-citation', null);
      expect(result.text).toBe(sampleText);
      expect(result.text).not.toContain('—');
    });

    it('should handle formatted citation with rich metadata', () => {
      const result = formatForPaste(sampleText, null, 'with-citation', formattedCitation);
      expect(result.text).toContain(sampleText);
      expect(result.text).toContain('My Article');
      expect(result.text).toContain('example.com');
      expect(result.text).toContain('— My Article — example.com');
    });

    it('should handle unknown format gracefully', () => {
      const result = formatForPaste(sampleText, sampleHtml, 'unknown' as PasteFormat, sampleCitation);
      expect(result.text).toBe(sampleText);
      expect(result.html).toBeNull();
    });
  });

  describe('stripHtmlTags', () => {
    it('should strip all HTML tags', () => {
      const html = '<div><p>Hello <b>world</b></p></div>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Hello world');
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<b>');
    });

    it('should convert <br> to newlines', () => {
      const html = 'Line one<br>Line two<br/>Line three';
      const result = stripHtmlTags(html);
      expect(result).toContain('Line one\nLine two\nLine three');
    });

    it('should convert block-level closing tags to newlines', () => {
      const html = '<p>Paragraph one</p><p>Paragraph two</p>';
      const result = stripHtmlTags(html);
      expect(result).toContain('Paragraph one');
      expect(result).toContain('Paragraph two');
      expect(result).toContain('\n');
    });

    it('should decode HTML entities', () => {
      const html = '&amp; &lt;tag&gt; &quot;quoted&quot; &#39;single&#39; &nbsp;space';
      const result = stripHtmlTags(html);
      expect(result).toContain('& <tag>');
      expect(result).toContain('"quoted"');
      expect(result).toContain("'single'");
      expect(result).toContain(' space');
    });

    it('should collapse excessive newlines', () => {
      const html = '<p>One</p><p></p><p></p><p></p><p>Two</p>';
      const result = stripHtmlTags(html);
      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should handle complex nested HTML', () => {
      const html = `
        <div class="article">
          <h1>Title</h1>
          <p>First <a href="#">paragraph</a> with <span style="color:red">styled text</span>.</p>
          <ul>
            <li>Item one</li>
            <li>Item two</li>
          </ul>
        </div>
      `;
      const result = stripHtmlTags(html);
      expect(result).toContain('Title');
      expect(result).toContain('paragraph');
      expect(result).toContain('styled text');
      expect(result).toContain('Item one');
      expect(result).not.toContain('class=');
      expect(result).not.toContain('href=');
      expect(result).not.toContain('style=');
    });

    it('should handle empty HTML', () => {
      expect(stripHtmlTags('')).toBe('');
    });

    it('should handle text with no HTML tags', () => {
      const plain = 'Just plain text with no tags';
      expect(stripHtmlTags(plain)).toBe(plain);
    });
  });

  describe('smart paste integration flow', () => {
    it('should produce correct output for full copy-with-citation flow', () => {
      // Simulate: user copies text, citation is generated, then pastes with citation
      const copiedText = 'AI will transform the economy in unprecedented ways.';
      const citation = generateCitation('url', 'https://www.nytimes.com/ai-article', 'AI Article');
      const result = formatForPaste(copiedText, null, 'with-citation', citation);

      expect(result.text).toBe(
        'AI will transform the economy in unprecedented ways.\n\n— https://www.nytimes.com/ai-article'
      );
    });

    it('should produce correct output for formatted citation flow', () => {
      const copiedText = 'Some important research finding.';
      const citation = generateCitation('formatted', 'https://www.nature.com/study', 'Breakthrough Study');

      expect(citation).not.toBeNull();
      expect(citation).toContain('Breakthrough Study');
      expect(citation).toContain('nature.com');

      const result = formatForPaste(copiedText, null, 'with-citation', citation);
      expect(result.text).toContain(copiedText);
      expect(result.text).toContain('Breakthrough Study');
      expect(result.text).toContain('nature.com');
    });

    it('should handle clean paste of complex HTML email content', () => {
      const htmlEmail = `
        <div style="font-family: Arial;">
          <p>Hi Team,</p>
          <p>Please review the <b>Q4 report</b> attached.</p>
          <br>
          <p>Thanks,<br>John</p>
        </div>
      `;
      const result = formatForPaste('', htmlEmail, 'clean', null);
      expect(result.text).toContain('Hi Team');
      expect(result.text).toContain('Q4 report');
      expect(result.text).toContain('Thanks');
      expect(result.text).toContain('John');
      expect(result.text).not.toContain('font-family');
      expect(result.text).not.toContain('<b>');
    });

    it('should handle all four formats for the same content', () => {
      const text = 'Important content';
      const html = '<p><b>Important</b> content</p>';
      const cite = 'https://example.com';

      const plain = formatForPaste(text, html, 'plain', cite);
      const rich = formatForPaste(text, html, 'rich', cite);
      const clean = formatForPaste(text, html, 'clean', cite);
      const withCite = formatForPaste(text, html, 'with-citation', cite);

      // Plain: just text, no HTML
      expect(plain.text).toBe(text);
      expect(plain.html).toBeNull();

      // Rich: text + HTML preserved
      expect(rich.text).toBe(text);
      expect(rich.html).toBe(html);

      // Clean: stripped text, no HTML
      expect(clean.text).toContain('Important content');
      expect(clean.html).toBeNull();

      // With-citation: text + citation appended
      expect(withCite.text).toContain(text);
      expect(withCite.text).toContain('— https://example.com');
    });
  });

  describe('Pro vs Free gating', () => {
    it('should downgrade formatted citation to URL for free users', () => {
      // This mirrors the logic in clipboard-interceptor.ts
      const style: CitationStyle = 'formatted';
      const isPro = false;
      const effectiveStyle = style === 'formatted' && !isPro ? 'url' : style;
      const citation = generateCitation(effectiveStyle, 'https://example.com/page', 'Title');
      expect(citation).toBe('https://example.com/page');
    });

    it('should allow formatted citation for Pro users', () => {
      const style: CitationStyle = 'formatted';
      const isPro = true;
      const effectiveStyle = style === 'formatted' && !isPro ? 'url' : style;
      const citation = generateCitation(effectiveStyle, 'https://example.com/page', 'Title');
      expect(citation).not.toBe('https://example.com/page');
      expect(citation).toContain('Title');
      expect(citation).toContain('example.com');
    });

    it('should always allow "none" citation regardless of pro status', () => {
      expect(generateCitation('none', 'https://example.com', 'Title')).toBeNull();
    });

    it('should always allow "url" citation regardless of pro status', () => {
      expect(generateCitation('url', 'https://example.com/page', 'Title')).toBe('https://example.com/page');
    });
  });
});
