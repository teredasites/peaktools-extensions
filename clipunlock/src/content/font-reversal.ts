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
 * Batches all characters into 2 getImageData calls to avoid Chrome warnings.
 */
export function buildCharMap(fontFamily: string): FontMapping {
  const charMap = new Map<string, string>();
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charCount = chars.length; // 62
  const cellW = 40; // width per character cell
  const cellH = 50;
  const canvasW = cellW * charCount;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { fontFamily, charMap };

  const size = 30;
  const refFont = `${size}px serif`;
  const testFont = `${size}px "${fontFamily}", serif`;

  // Render ALL chars in the reference font, one getImageData call
  ctx.font = refFont;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  for (let i = 0; i < charCount; i++) {
    ctx.fillText(chars[i], i * cellW + 4, 10);
  }
  const refData = ctx.getImageData(0, 0, canvasW, cellH).data;

  // Render ALL chars in the custom font, one getImageData call
  ctx.clearRect(0, 0, canvasW, cellH);
  ctx.font = testFont;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  for (let i = 0; i < charCount; i++) {
    ctx.fillText(chars[i], i * cellW + 4, 10);
  }
  const testData = ctx.getImageData(0, 0, canvasW, cellH).data;

  // Hash each character cell from both renders
  function hashCell(data: Uint8ClampedArray, cellIndex: number): string {
    let hash = 0;
    const xStart = cellIndex * cellW;
    for (let y = 0; y < cellH; y++) {
      for (let x = xStart; x < xStart + cellW; x++) {
        const idx = (y * canvasW + x) * 4 + 3; // alpha channel
        if (data[idx] > 0) hash += idx * data[idx];
      }
    }
    return String(hash);
  }

  // Build reference hash → char lookup
  const refHashes = new Map<string, string>();
  const refCellHashes: string[] = [];
  for (let i = 0; i < charCount; i++) {
    const h = hashCell(refData, i);
    refHashes.set(h, chars[i]);
    refCellHashes.push(h);
  }

  // Compare custom font cells to reference
  let mismatches = 0;
  for (let i = 0; i < charCount; i++) {
    const customHash = hashCell(testData, i);
    if (customHash !== refCellHashes[i]) {
      const matchedChar = refHashes.get(customHash);
      if (matchedChar && matchedChar !== chars[i]) {
        charMap.set(chars[i], matchedChar);
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
