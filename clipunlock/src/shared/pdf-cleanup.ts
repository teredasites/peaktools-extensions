/**
 * PDF Line Break Cleanup
 *
 * Detects and fixes artificial line breaks that PDF viewers inject into copied text:
 * - Short lines ending mid-sentence (PDF column width wrapping)
 * - Hyphenated words split across lines ("con-\ntinue" → "continue")
 * - Double line breaks preserved as paragraph separators
 * - Bullet/list detection to avoid merging list items
 *
 * Pro-only feature.
 */

/** Heuristic: does this text look like it was copied from a PDF? */
export function detectPdfFormatting(text: string): boolean {
  if (!text || text.length < 50) return false;

  const lines = text.split('\n');
  if (lines.length < 3) return false;

  // Count lines that end mid-sentence (no terminal punctuation, not blank, not a header)
  let midSentenceEnds = 0;
  let totalContentLines = 0;
  let hyphenatedBreaks = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (line.length === 0) continue;
    totalContentLines++;

    // Check for hyphenated word break at end of line
    if (/[a-zA-Z]-$/.test(line) && i + 1 < lines.length && /^[a-z]/.test(lines[i + 1].trimStart())) {
      hyphenatedBreaks++;
    }

    // Check for mid-sentence line ending (lowercase letter or comma at end,
    // next line starts with lowercase — strong PDF signal)
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trimStart();
      if (nextLine.length > 0 && /[a-z,]$/.test(line) && /^[a-z]/.test(nextLine)) {
        midSentenceEnds++;
      }
    }
  }

  if (totalContentLines === 0) return false;

  // If >30% of content lines end mid-sentence, or there are hyphenated breaks, it's PDF text
  const midSentenceRatio = midSentenceEnds / totalContentLines;
  return midSentenceRatio > 0.3 || hyphenatedBreaks >= 2;
}

/** Clean up PDF-style line breaks while preserving intentional paragraph breaks */
export function cleanPdfLineBreaks(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let currentParagraph = '';
  let lastWasHyphenStrip = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimEnd();
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

    // Empty line = paragraph break
    if (trimmedLine.length === 0) {
      if (currentParagraph) {
        result.push(currentParagraph.trim());
        currentParagraph = '';
      }
      lastWasHyphenStrip = false;
      continue;
    }

    // Detect list items — don't merge these with previous text
    if (/^\s*[\u2022\u2023\u25E6\u2043\u2219•\-\*]\s/.test(trimmedLine) ||
        /^\s*\d+[\.\)]\s/.test(trimmedLine) ||
        /^\s*[a-zA-Z][\.\)]\s/.test(trimmedLine)) {
      if (currentParagraph) {
        result.push(currentParagraph.trim());
        currentParagraph = '';
      }
      lastWasHyphenStrip = false;
      currentParagraph = trimmedLine;
      // If next line is also a list item or blank, flush this line
      if (!nextLine || nextLine.trim().length === 0 ||
          /^\s*[\u2022\u2023\u25E6\u2043\u2219•\-\*]\s/.test(nextLine) ||
          /^\s*\d+[\.\)]\s/.test(nextLine)) {
        result.push(currentParagraph.trim());
        currentParagraph = '';
      }
      continue;
    }

    // Detect headers (short line, next line is blank or doesn't start lowercase)
    if (trimmedLine.length < 60 && /[A-Z]/.test(trimmedLine[0]) &&
        /[A-Za-z0-9]$/.test(trimmedLine) && !/[,;]$/.test(trimmedLine)) {
      const nextIsContinuation = nextLine && nextLine.trim().length > 0 && /^[a-z]/.test(nextLine.trimStart());
      if (!nextIsContinuation) {
        if (currentParagraph) {
          result.push(currentParagraph.trim());
          currentParagraph = '';
        }
        lastWasHyphenStrip = false;
        result.push(trimmedLine);
        continue;
      }
    }

    // Hyphenated word break: "con-" + "tinue" → "continue"
    if (/[a-zA-Z]-$/.test(trimmedLine) && nextLine && /^[a-z]/.test(nextLine.trimStart())) {
      if (currentParagraph) {
        if (lastWasHyphenStrip) {
          // Previous line also had hyphen stripped — concatenate directly
          currentParagraph += trimmedLine.slice(0, -1);
        } else if (currentParagraph.endsWith(' ')) {
          currentParagraph += trimmedLine.slice(0, -1);
        } else {
          currentParagraph += ' ' + trimmedLine.slice(0, -1);
        }
      } else {
        currentParagraph = trimmedLine.slice(0, -1);
      }
      lastWasHyphenStrip = true;
      continue;
    }

    // Normal mid-sentence line break: join with space
    if (currentParagraph) {
      if (lastWasHyphenStrip) {
        // After hyphen removal, concatenate directly (no space) to rejoin the word
        currentParagraph += trimmedLine;
      } else if (currentParagraph.endsWith(' ')) {
        currentParagraph += trimmedLine;
      } else {
        currentParagraph += ' ' + trimmedLine;
      }
    } else {
      currentParagraph = trimmedLine;
    }
    lastWasHyphenStrip = false;

    // Check if this line ends a sentence (period, question mark, exclamation, colon)
    // AND next line starts a new sentence (capital letter after blank or starts with capital)
    if (nextLine !== null) {
      const nextTrimmed = nextLine.trimStart();
      const endsWithTerminal = /[.!?:]\s*$/.test(trimmedLine) || /[.!?:"')\]]\s*$/.test(trimmedLine);
      const nextStartsNew = nextTrimmed.length > 0 && /^[A-Z\u201C\u2018"'([]/.test(nextTrimmed);
      const nextIsBlank = nextTrimmed.length === 0;

      // Paragraph break: terminal punctuation + next line starts with capital, or next is blank
      if (nextIsBlank || (endsWithTerminal && nextStartsNew && trimmedLine.length < 100)) {
        // Don't break paragraphs at abbreviations (Dr., Mr., etc.)
        // Only break if line is short (PDF column width) - long lines are probably fine
      }
    }
  }

  // Flush remaining paragraph
  if (currentParagraph) {
    result.push(currentParagraph.trim());
  }

  return result.join('\n\n');
}
