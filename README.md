# PeakTools Chrome Extensions

Chrome extension monorepo by PeakTools Publishing.

## Extensions

### CopyUnlock

Removes copy restrictions from any webpage. Works on sites that block text selection, right-click, and keyboard shortcuts.

- **39 bypass methods** covering CSS, JavaScript, iframe, canvas, and shadow DOM restrictions
- **54 locales** with full internationalization
- **Privacy-first** — zero telemetry, zero data collection, no network requests
- **Sub-10ms execution** with minimal resource footprint
- **Vitest test suite** with full coverage

Published on the [Chrome Web Store](https://chromewebstore.google.com/).

### License Worker

Cloudflare Worker powering the subscription licensing system for Pro features.

## Tech Stack

- TypeScript, Chrome Extensions Manifest V3
- Vitest for testing
- Cloudflare Workers for backend
- i18n across 54 locales

## Development

```bash
cd clipunlock
npm install
npm run build
```

Load unpacked extension from `clipunlock/` in `chrome://extensions`.

## Testing

```bash
cd clipunlock
npm test
```

---

[peaktools.dev](https://peaktools.dev)
