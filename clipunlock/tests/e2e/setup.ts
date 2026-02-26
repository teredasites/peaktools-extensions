import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

let browser: Browser;

export async function launchBrowser(): Promise<Browser> {
  browser = await puppeteer.launch({
    headless: false, // Extensions require headed mode
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: {
      width: 1280,
      height: 720,
    },
  });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
  }
}

export async function getExtensionId(): Promise<string> {
  // Navigate to chrome://extensions and find our extension
  const page = await browser.newPage();
  await page.goto('chrome://extensions/', { waitUntil: 'networkidle0' });

  // Get extension ID from the extensions page
  const extensionId = await page.evaluate(() => {
    // Look for CopyUnlock extension
    const extensions = document.querySelectorAll('extensions-item');
    for (const ext of extensions) {
      const name = ext.shadowRoot?.querySelector('#name')?.textContent;
      if (name?.includes('CopyUnlock')) {
        return ext.getAttribute('id');
      }
    }
    return null;
  });

  await page.close();
  return extensionId || '';
}

export async function createProtectedTestPage(page: Page): Promise<void> {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          user-select: none;
          -webkit-user-select: none;
        }
        .protected-text {
          user-select: none;
        }
        .normal-text {
          user-select: text;
        }
      </style>
    </head>
    <body oncontextmenu="return false" oncopy="return false" onselectstart="return false">
      <div class="protected-text" id="protected">
        This text is protected and cannot be copied normally.
      </div>
      <div class="normal-text" id="normal">
        This text should be copyable.
      </div>
      <script>
        document.addEventListener('copy', function(e) {
          e.preventDefault();
          return false;
        });
        document.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          return false;
        });
        document.addEventListener('selectstart', function(e) {
          e.preventDefault();
          return false;
        });
      </script>
    </body>
    </html>
  `);
}

export async function createSafeModePage(page: Page): Promise<void> {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { user-select: none; }
      </style>
    </head>
    <body>
      <form id="test-form">
        <input type="text" id="text-input" value="test value">
        <textarea id="text-area">some text</textarea>
        <button type="submit">Submit</button>
      </form>
      <div id="content" tabindex="0">
        <p>Content that is protected but should allow keyboard navigation.</p>
      </div>
      <script>
        document.addEventListener('copy', function(e) {
          e.preventDefault();
        });
      </script>
    </body>
    </html>
  `);
}

export { browser };
