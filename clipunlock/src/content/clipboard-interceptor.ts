import type { ClipboardCapturePayload } from '../shared/messages';
import { sendMessage } from '../shared/messages';
import { WATERMARK_REGEX, DEDUP_WINDOW_MS, PREVIEW_LENGTH } from '../shared/constants';
import { createLogger } from '../shared/logger';

const log = createLogger('clipboard-interceptor');

let lastCapturedText = '';
let lastCapturedTime = 0;
let watermarkStrippingEnabled = true;
let interceptorActive = false;

export function setWatermarkStripping(enabled: boolean): void {
  watermarkStrippingEnabled = enabled;
}

function detectContentType(text: string): string {
  if (/^https?:\/\/\S+$/i.test(text.trim())) return 'url';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) return 'email';
  if (/^(function|const|let|var|class|import|export|if|for|while|return|async|await)\b/.test(text.trim()) ||
      /[{}\[\]();]/.test(text) && text.split('\n').length > 2) return 'code';
  return 'text';
}

function stripWatermarks(text: string): { cleaned: string; stripped: boolean } {
  if (!watermarkStrippingEnabled) return { cleaned: text, stripped: false };
  const cleaned = text.replace(WATERMARK_REGEX, '');
  return { cleaned, stripped: cleaned !== text };
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
  const { cleaned, stripped } = stripWatermarks(rawText);
  let html: string | null = null;
  if (event.clipboardData) {
    html = event.clipboardData.getData('text/html') || null;
  }
  if (stripped && event.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData('text/plain', cleaned);
    if (html) {
      event.clipboardData.setData('text/html', html);
    }
    log.info('watermarks stripped from copied text');
  }
  const payload: ClipboardCapturePayload = {
    content: cleaned,
    html,
    sourceUrl: location.href,
    sourceTitle: document.title,
    wasUnlocked: false,
    watermarkStripped: stripped,
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
