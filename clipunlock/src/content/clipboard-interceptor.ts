import type { ClipboardCapturePayload } from '../shared/messages';
import type { CitationStyle } from '../shared/types';
import { sendMessage } from '../shared/messages';
import { WATERMARK_REGEX, DEDUP_WINDOW_MS } from '../shared/constants';
import { detectPdfFormatting, cleanPdfLineBreaks } from '../shared/pdf-cleanup';
import { createLogger } from '../shared/logger';

const log = createLogger('clipboard-interceptor');

let lastCapturedText = '';
let lastCapturedTime = 0;
let watermarkStrippingEnabled = true;
let interceptorActive = false;
let citationStyle: CitationStyle = 'url';
let pdfCleanupEnabled = false;
let isPro = false;

export function setWatermarkStripping(enabled: boolean): void {
  watermarkStrippingEnabled = enabled;
}

export function setCitationStyle(style: CitationStyle): void {
  citationStyle = style;
}

export function setPdfCleanup(enabled: boolean): void {
  pdfCleanupEnabled = enabled;
}

export function setProStatus(pro: boolean): void {
  isPro = pro;
}

function stripWatermarks(text: string): { cleaned: string; stripped: boolean } {
  if (!watermarkStrippingEnabled) return { cleaned: text, stripped: false };
  const cleaned = text.replace(WATERMARK_REGEX, '');
  return { cleaned, stripped: cleaned !== text };
}

/** Generate a citation string for the copied text */
function generateCitation(style: CitationStyle, sourceUrl: string, sourceTitle: string): string | null {
  if (style === 'none') return null;

  const domain = (() => {
    try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); }
    catch { return sourceUrl; }
  })();

  if (style === 'url') {
    // Simple: just the URL
    return sourceUrl;
  }

  if (style === 'formatted') {
    // Rich formatted citation: "Title — domain.com — Feb 26, 2026"
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const title = sourceTitle || domain;
    return `${title} — ${domain} — ${date}`;
  }

  return null;
}

function handleCopy(event: ClipboardEvent): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const rawText = sel.toString();
  if (!rawText || rawText.length === 0) return;
  const now = Date.now();
  if (rawText === lastCapturedText && now - lastCapturedTime < DEDUP_WINDOW_MS) {
    log.debug('dedup: skipping duplicate copy within window');
    return;
  }
  lastCapturedText = rawText;
  lastCapturedTime = now;

  // Step 1: Strip watermarks
  const { cleaned, stripped } = stripWatermarks(rawText);

  // Step 2: PDF cleanup (Pro only)
  let finalContent = cleaned;
  let didPdfClean = false;
  if (pdfCleanupEnabled && isPro && detectPdfFormatting(cleaned)) {
    finalContent = cleanPdfLineBreaks(cleaned);
    didPdfClean = true;
    log.info('PDF line break cleanup applied');
  }

  // Step 3: Generate citation
  const citation = generateCitation(
    // Formatted citation is Pro-only; free users get 'url' at best
    citationStyle === 'formatted' && !isPro ? 'url' : citationStyle,
    location.href,
    document.title
  );

  let html: string | null = null;
  if (event.clipboardData) {
    html = event.clipboardData.getData('text/html') || null;
  }

  // If we modified the text (watermark strip or PDF cleanup), update clipboard
  if ((stripped || didPdfClean) && event.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData('text/plain', finalContent);
    if (html) {
      event.clipboardData.setData('text/html', html);
    }
    if (stripped) log.info('watermarks stripped from copied text');
  }

  const payload: ClipboardCapturePayload = {
    content: finalContent,
    html,
    sourceUrl: location.href,
    sourceTitle: document.title,
    wasUnlocked: false,
    watermarkStripped: stripped,
    citation: citation ?? undefined,
    pdfCleaned: didPdfClean || undefined,
  };
  sendMessage({ type: 'CLIPBOARD_CAPTURE', payload }).catch((err) => {
    log.error('failed to send clipboard capture:', err);
  });
}

export function startInterceptor(): void {
  if (interceptorActive) return;
  interceptorActive = true;
  document.addEventListener('copy', handleCopy, true);
  document.addEventListener('cut', handleCopy, true);
  log.info('clipboard interceptor started');
}

export function stopInterceptor(): void {
  if (!interceptorActive) return;
  interceptorActive = false;
  document.removeEventListener('copy', handleCopy, true);
  document.removeEventListener('cut', handleCopy, true);
  log.info('clipboard interceptor stopped');
}
