// ─── Font Cipher Reversal ───
// Detects and reverses custom font substitution ciphers used to prevent copy-paste.
// Some sites use custom @font-face fonts where visual glyphs don't match Unicode codepoints,
// so copying "Hello" might paste as "Xyzzy". This module analyzes the font mapping and
// reverses the substitution on copied text.

import { createLogger } from '../shared/logger';

const log = createLogger('font-reversal');

interface FontMapping {
  fontFamily: string;
  charMap: Map<string, string>; // displayed char → real char
}

// Known font cipher patterns
const KNOWN_CIPHER_PATTERNS: Array<{ test: RegExp; name: string }> = [
  { test: /scrambl|cipher|protect|obfus|custom-text|anti.?copy/i, name: 'anti-copy font' },
];

/**
 * Find all custom @font-face declarations that aren't standard web fonts
 */
export function findCustomFonts(): string[] {
  const standardFonts = new Set([
    'arial', 'helvetica', 'times new roman', 'times', 'courier new', 'courier',
    'verdana', 'georgia', 'palatino', 'garamond', 'bookman', 'tahoma', 'trebuchet ms',
    'impact', 'comic sans ms', 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'oxygen',
    'ubuntu', 'cantarell', 'fira sans', 'droid sans', 'helvetica neue',
    // Google Fonts — common ones
    'open sans', 'lato', 'montserrat', 'source sans pro', 'raleway', 'poppins',
    'noto sans', 'inter', 'nunito', 'pt sans', 'work sans', 'playfair display',
    'material icons', 'material symbols', 'font awesome',
    // Icon fonts
    'fontawesome', 'glyphicons', 'ionicons', 'icomoon',
  ]);

  const customFonts: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) {
          const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim().toLowerCase();
          if (!standardFonts.has(family) && family.length > 0) {
            // Check if it's an icon font (typically has very few glyphs or unicode-range in private use area)
            const unicodeRange = rule.style.getPropertyValue('unicode-range');
            if (unicodeRange && /U\+E[0-9A-F]/i.test(unicodeRange)) continue; // Icon font
            customFonts.push(family);
          }
        }
      }
    } catch {
      // Skip cross-origin stylesheets
    }
  }

  return [...new Set(customFonts)];
}

/**
 * Detect if any custom fonts match known cipher patterns
 */
export function detectCipherFonts(): string[] {
  const customs = findCustomFonts();
  const suspicious: string[] = [];

  for (const font of customs) {
    for (const pattern of KNOWN_CIPHER_PATTERNS) {
      if (pattern.test.test(font)) {
        suspicious.push(font);
        break;
      }
    }
  }

  return suspicious;
}

/**
 * Build a character mapping by rendering text with the custom font
 * and comparing to a reference font. Uses canvas for pixel comparison.
 */
export function buildCharMap(fontFamily: string): FontMapping {
  const charMap = new Map<string, string>();
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { fontFamily, charMap };

  const size = 30;
  const refFont = `${size}px serif`;
  const testFont = `${size}px "${fontFamily}", serif`;

  // Render each printable ASCII character in both fonts and compare
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function getGlyphHash(font: string, char: string): string {
    ctx!.clearRect(0, 0, 100, 50);
    ctx!.font = font;
    ctx!.fillStyle = '#000';
    ctx!.textBaseline = 'top';
    ctx!.fillText(char, 10, 10);
    const data = ctx!.getImageData(0, 0, 100, 50).data;
    // Simple hash: sum of non-zero alpha pixels and their positions
    let hash = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) hash += i * data[i];
    }
    return String(hash);
  }

  // Build reference hashes for standard font
  const refHashes = new Map<string, string>();
  for (const char of chars) {
    refHashes.set(getGlyphHash(refFont, char), char);
  }

  // Compare custom font glyphs to reference
  let mismatches = 0;
  for (const char of chars) {
    const customHash = getGlyphHash(testFont, char);
    const refHash = getGlyphHash(refFont, char);

    if (customHash !== refHash) {
      // This character renders differently in the custom font
      // Try to find which reference character it visually matches
      const matchedChar = refHashes.get(customHash);
      if (matchedChar && matchedChar !== char) {
        charMap.set(char, matchedChar);
        mismatches++;
      }
    }
  }

  if (mismatches > 0) {
    log.info(`font "${fontFamily}": found ${mismatches} character substitutions`);
  }

  return { fontFamily, charMap };
}

/**
 * Reverse font cipher substitution on the given text
 */
export function reverseSubstitution(text: string, mapping: FontMapping): string {
  if (mapping.charMap.size === 0) return text;

  let result = '';
  for (const char of text) {
    result += mapping.charMap.get(char) ?? char;
  }
  return result;
}

/**
 * Full pipeline: detect cipher fonts, build maps, and register a copy interceptor
 * that reverses substitution on copied text.
 */
export function installFontReversal(): { fontsDetected: number; mappingsBuilt: number } {
  const cipherFonts = detectCipherFonts();
  if (cipherFonts.length === 0) {
    // Also check ALL custom fonts for substitution patterns
    const allCustom = findCustomFonts();
    // Build mappings for any custom font that has character substitutions
    const mappings: FontMapping[] = [];
    for (const font of allCustom.slice(0, 5)) { // Limit to 5 fonts for performance
      const mapping = buildCharMap(font);
      if (mapping.charMap.size > 3) { // At least 4 substitutions to be considered a cipher
        mappings.push(mapping);
      }
    }

    if (mappings.length === 0) {
      return { fontsDetected: 0, mappingsBuilt: 0 };
    }

    registerCopyInterceptor(mappings);
    return { fontsDetected: allCustom.length, mappingsBuilt: mappings.length };
  }

  const mappings: FontMapping[] = [];
  for (const font of cipherFonts) {
    const mapping = buildCharMap(font);
    if (mapping.charMap.size > 0) {
      mappings.push(mapping);
    }
  }

  if (mappings.length > 0) {
    registerCopyInterceptor(mappings);
  }

  return { fontsDetected: cipherFonts.length, mappingsBuilt: mappings.length };
}

/**
 * Register a capture-phase copy event listener that reverses font substitution
 */
function registerCopyInterceptor(mappings: FontMapping[]): void {
  document.addEventListener('copy', (event: ClipboardEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let text = sel.toString();
    if (!text) return;

    // Determine which font the selected text uses
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement;
    if (!el) return;

    const computedFont = window.getComputedStyle(el).fontFamily.toLowerCase();

    // Apply reversals for matching fonts
    for (const mapping of mappings) {
      if (computedFont.includes(mapping.fontFamily.toLowerCase())) {
        const reversed = reverseSubstitution(text, mapping);
        if (reversed !== text) {
          event.preventDefault();
          event.clipboardData?.setData('text/plain', reversed);
          log.info(`reversed font cipher for "${mapping.fontFamily}": ${text.length} chars`);
          text = reversed;
        }
        break;
      }
    }
  }, true);

  log.info(`font reversal interceptor installed for ${mappings.length} font(s)`);
}
