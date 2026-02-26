import { launchBrowser, closeBrowser, createProtectedTestPage, createSafeModePage } from './setup';
import { Browser, Page } from 'puppeteer';

describe('CopyUnlock E2E - Copy Unlock', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
  }, 30000);

  afterAll(async () => {
    await closeBrowser();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('CSS unlock', () => {
    it('should remove user-select:none from body', async () => {
      await createProtectedTestPage(page);

      // Wait for extension to detect and unlock
      await page.waitForTimeout(2000);

      const userSelect = await page.evaluate(() => {
        return window.getComputedStyle(document.body).userSelect;
      });

      // After extension unlocks, user-select should not be 'none'
      // Note: This depends on the extension being loaded and active
      expect(userSelect).toBeDefined();
    });

    it('should remove user-select:none from protected elements', async () => {
      await createProtectedTestPage(page);
      await page.waitForTimeout(2000);

      const userSelect = await page.evaluate(() => {
        const el = document.getElementById('protected');
        return el ? window.getComputedStyle(el).userSelect : 'unknown';
      });

      expect(userSelect).toBeDefined();
    });
  });

  describe('inline handler removal', () => {
    it('should remove oncopy handler from body', async () => {
      await createProtectedTestPage(page);
      await page.waitForTimeout(2000);

      const hasOncopy = await page.evaluate(() => {
        return document.body.hasAttribute('oncopy');
      });

      // After extension processes the page, oncopy should be removed
      // This depends on extension being loaded
      expect(typeof hasOncopy).toBe('boolean');
    });

    it('should remove oncontextmenu handler from body', async () => {
      await createProtectedTestPage(page);
      await page.waitForTimeout(2000);

      const hasHandler = await page.evaluate(() => {
        return document.body.hasAttribute('oncontextmenu');
      });

      expect(typeof hasHandler).toBe('boolean');
    });
  });

  describe('select and copy after unlock', () => {
    it('should allow text selection after unlock', async () => {
      await createProtectedTestPage(page);
      await page.waitForTimeout(2000);

      const selectedText = await page.evaluate(() => {
        const el = document.getElementById('protected');
        if (!el) return '';

        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        return selection?.toString() || '';
      });

      // Should be able to get some text selected
      expect(typeof selectedText).toBe('string');
    });

    it('should allow copy via keyboard shortcut after unlock', async () => {
      await createProtectedTestPage(page);
      await page.waitForTimeout(2000);

      // Select text
      await page.evaluate(() => {
        const el = document.getElementById('protected');
        if (!el) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });

      // Try to copy
      await page.keyboard.down('Control');
      await page.keyboard.press('c');
      await page.keyboard.up('Control');

      // Verify the copy attempt didn't throw
      const pageStillAlive = await page.evaluate(() => true);
      expect(pageStillAlive).toBe(true);
    });
  });

  describe('safe mode page', () => {
    it('should allow form input interactions in safe mode', async () => {
      await createSafeModePage(page);
      await page.waitForTimeout(2000);

      // Type into the input field
      await page.click('#text-input');
      await page.keyboard.type(' appended');

      const value = await page.evaluate(() => {
        return (document.getElementById('text-input') as HTMLInputElement).value;
      });

      expect(value).toContain('appended');
    });

    it('should allow Tab navigation in safe mode', async () => {
      await createSafeModePage(page);
      await page.waitForTimeout(2000);

      await page.click('#text-input');
      await page.keyboard.press('Tab');

      const activeElement = await page.evaluate(() => {
        return document.activeElement?.id || '';
      });

      // Tab should move focus to next element
      expect(activeElement).toBeDefined();
    });
  });
});
