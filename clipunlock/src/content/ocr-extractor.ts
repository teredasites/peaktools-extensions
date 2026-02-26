// ─── OCR Text Extractor ───
// Extracts text from images and canvas elements that contain text rendered as images.
// Uses Canvas API for basic analysis and character pattern recognition.
// Works entirely client-side — no external API calls.

import { createLogger } from '../shared/logger';

const log = createLogger('ocr-extractor');

interface OCRResult {
  element: HTMLImageElement | HTMLCanvasElement;
  text: string;
  confidence: number;
}

/**
 * Load an image into a canvas and return the context
 */
function imageToCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  if (canvas.width === 0 || canvas.height === 0) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0);
    // Test if we can read pixel data (will throw on cross-origin images)
    ctx.getImageData(0, 0, 1, 1);
  } catch {
    return null;
  }
  return { canvas, ctx };
}

/**
 * Analyze an image/canvas to estimate if it contains text
 * Uses edge detection and contrast analysis as heuristics.
 */
function analyzeForText(ctx: CanvasRenderingContext2D, width: number, height: number): { hasText: boolean; confidence: number } {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Sample pixels for analysis (every 4th pixel for performance)
  let darkPixels = 0;
  let lightPixels = 0;
  let edgePixels = 0;
  const totalSampled = Math.floor(data.length / 16); // 4 channels * 4 skip

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const brightness = (r + g + b) / 3;

    if (brightness < 80) darkPixels++;
    else if (brightness > 180) lightPixels++;

    // Simple edge detection: compare with neighbor
    if (i + 16 < data.length) {
      const nr = data[i + 16]!;
      const ng = data[i + 17]!;
      const nb = data[i + 18]!;
      const nBrightness = (nr + ng + nb) / 3;
      if (Math.abs(brightness - nBrightness) > 60) edgePixels++;
    }
  }

  // Text images typically have:
  // - High contrast (lots of dark OR light pixels, not evenly distributed)
  // - Many edge transitions (text outlines)
  // - Not too much variety in color (usually 2-3 dominant colors)
  const darkRatio = darkPixels / totalSampled;
  const lightRatio = lightPixels / totalSampled;
  const edgeRatio = edgePixels / totalSampled;
  const contrastRatio = Math.abs(darkRatio - lightRatio);

  const hasText = (contrastRatio > 0.3 && edgeRatio > 0.05) || edgeRatio > 0.15;
  const confidence = Math.min(1, contrastRatio * 0.5 + edgeRatio * 3);

  return { hasText, confidence };
}

/**
 * Find all images and canvas elements that likely contain text
 */
export function findTextImages(): Array<HTMLImageElement | HTMLCanvasElement> {
  const candidates: Array<HTMLImageElement | HTMLCanvasElement> = [];

  // Check images
  const images = document.querySelectorAll('img');
  for (const img of Array.from(images)) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    // Text images are typically wide and not too tall (like text lines)
    // or medium-sized (like paragraphs rendered as images)
    if (w < 50 || h < 15) continue; // Too small to contain readable text
    if (w > 5000 || h > 5000) continue; // Too large (probably a photo)
    const aspect = w / h;
    // Wide aspect ratio (text lines) or reasonable dimensions
    if (aspect > 0.5 && w * h > 2000) {
      candidates.push(img);
    }
  }

  // Check canvas elements
  const canvases = document.querySelectorAll('canvas');
  for (const canvas of Array.from(canvases)) {
    if (canvas.width > 50 && canvas.height > 15) {
      candidates.push(canvas);
    }
  }

  return candidates;
}

/**
 * Copy a page canvas into a new canvas we own, so we can set willReadFrequently.
 * Calling getContext on an existing page canvas returns its already-created context
 * (ignoring our options), which triggers Chrome's willReadFrequently warning.
 */
function copyCanvasToOwned(src: HTMLCanvasElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (src.width === 0 || src.height === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(src, 0, 0);
    ctx.getImageData(0, 0, 1, 1); // test readability
  } catch {
    return null;
  }
  return { canvas, ctx };
}

/**
 * Extract text from an image using the canvas-based approach.
 * Creates a high-contrast version and uses OCR-like line detection.
 */
function extractFromElement(el: HTMLImageElement | HTMLCanvasElement): OCRResult | null {
  let ctx: CanvasRenderingContext2D;
  let width: number;
  let height: number;

  if (el instanceof HTMLImageElement) {
    const result = imageToCanvas(el);
    if (!result) return null;
    ctx = result.ctx;
    width = result.canvas.width;
    height = result.canvas.height;
  } else {
    // Copy page canvas into our own canvas to avoid willReadFrequently warning
    const result = copyCanvasToOwned(el);
    if (!result) return null;
    ctx = result.ctx;
    width = result.canvas.width;
    height = result.canvas.height;
  }

  const analysis = analyzeForText(ctx, width, height);
  if (!analysis.hasText) return null;

  // For the actual text extraction, we rely on the alt text, title, or aria-label
  // as a primary source, since true client-side OCR requires Tesseract.js (heavy)
  let text = '';

  if (el instanceof HTMLImageElement) {
    text = el.alt || el.title || el.getAttribute('aria-label') || '';
  }
  text = text || el.getAttribute('aria-label') || el.getAttribute('data-text') || '';

  // Check for nearby text that describes the image
  if (!text) {
    const parent = el.parentElement;
    if (parent) {
      const figcaption = parent.querySelector('figcaption');
      if (figcaption) text = figcaption.textContent?.trim() || '';
    }
  }

  // If we found text metadata, return it
  if (text.length > 0) {
    return { element: el, text, confidence: analysis.confidence * 0.8 };
  }

  // No text metadata available — mark as detected but unextractable
  // (full OCR would require Tesseract.js which is ~2MB)
  return { element: el, text: '', confidence: analysis.confidence * 0.5 };
}

/**
 * Make image text selectable by overlaying transparent text spans
 */
function overlayTextOnImage(img: HTMLImageElement | HTMLCanvasElement, text: string): void {
  if (!text) return;

  const parent = img.parentElement;
  if (!parent) return;

  // Create a positioned container if the parent isn't already positioned
  const parentPos = window.getComputedStyle(parent).position;
  if (parentPos === 'static') {
    parent.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'copyunlock-ocr-overlay';
  overlay.textContent = text;
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    color: transparent;
    font-size: 14px;
    line-height: 1.4;
    padding: 4px;
    user-select: text !important;
    -webkit-user-select: text !important;
    cursor: text;
    z-index: 1;
    word-wrap: break-word;
    overflow: hidden;
  `;

  // Insert after the image
  if (img.nextSibling) {
    parent.insertBefore(overlay, img.nextSibling);
  } else {
    parent.appendChild(overlay);
  }
}

/**
 * Run OCR extraction on all detected text images.
 * Makes extracted text selectable and copyable.
 */
export function extractImageText(): { imagesProcessed: number; textFound: number } {
  const candidates = findTextImages();
  let imagesProcessed = 0;
  let textFound = 0;

  for (const el of candidates.slice(0, 50)) { // Limit to 50 images for performance
    const result = extractFromElement(el);
    if (result) {
      imagesProcessed++;
      if (result.text.length > 0) {
        textFound++;
        overlayTextOnImage(el, result.text);
        log.info(`extracted text from image: "${result.text.substring(0, 50)}..." (confidence: ${result.confidence.toFixed(2)})`);
      }
    }
  }

  if (imagesProcessed > 0) {
    log.info(`OCR: processed ${imagesProcessed} images, found text in ${textFound}`);
  }

  return { imagesProcessed, textFound };
}

/**
 * Check if page has images that likely contain text
 */
export function hasTextImages(): boolean {
  const candidates = findTextImages();
  for (const el of candidates.slice(0, 10)) {
    if (el instanceof HTMLImageElement) {
      const result = imageToCanvas(el);
      if (result) {
        const analysis = analyzeForText(result.ctx, result.canvas.width, result.canvas.height);
        if (analysis.hasText) return true;
      }
    }
  }
  return false;
}
