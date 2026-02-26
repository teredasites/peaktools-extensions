import '../setup';
import {
  FREE_MAX_ITEMS,
  FREE_MAX_COLLECTIONS,
  PRO_MAX_ITEMS,
  PRO_MAX_COLLECTIONS,
  FREE_RETENTION_DAYS,
  PRO_RETENTION_DAYS,
  COLLECTION_COLORS,
} from '../../src/shared/constants';
import type { CitationStyle, PasteFormat, ExtensionSettings } from '../../src/shared/types';
import { DEFAULT_SETTINGS } from '../../src/shared/types';

/**
 * Tests for Pro vs Free tier gating logic.
 * Ensures free users can't access Pro-only features
 * and Pro users get full access.
 */

interface ProStatus {
  isPro: boolean;
  trialActive: boolean;
  trialDaysLeft: number;
}

/** Simulate the options page limit clamping logic */
function getEffectiveLimits(isPro: boolean): {
  maxItems: number;
  maxRetentionDays: number;
  maxCollections: number;
} {
  return {
    maxItems: isPro ? PRO_MAX_ITEMS : FREE_MAX_ITEMS,
    maxRetentionDays: isPro ? PRO_RETENTION_DAYS : FREE_RETENTION_DAYS,
    maxCollections: isPro ? PRO_MAX_COLLECTIONS : FREE_MAX_COLLECTIONS,
  };
}

/** Simulate citation style gating from clipboard-interceptor.ts */
function getEffectiveCitationStyle(style: CitationStyle, isPro: boolean): CitationStyle {
  if (style === 'formatted' && !isPro) return 'url';
  return style;
}

/** Simulate whether PDF cleanup should run */
function shouldRunPdfCleanup(settingEnabled: boolean, isPro: boolean): boolean {
  return settingEnabled && isPro;
}

/** Simulate options page control states */
function getControlStates(isPro: boolean): {
  pdfCleanupDisabled: boolean;
  formattedCitationDisabled: boolean;
  maxItemsCap: number;
  retentionDaysCap: number;
} {
  return {
    pdfCleanupDisabled: !isPro,
    formattedCitationDisabled: !isPro,
    maxItemsCap: isPro ? 100000 : 500,
    retentionDaysCap: isPro ? 3650 : 30,
  };
}

/** Simulate clamping user values to effective limits */
function clampSettings(
  settings: Pick<ExtensionSettings, 'maxItems' | 'retentionDays'>,
  isPro: boolean
): Pick<ExtensionSettings, 'maxItems' | 'retentionDays'> {
  const limits = getEffectiveLimits(isPro);
  return {
    maxItems: Math.min(settings.maxItems, limits.maxItems),
    retentionDays: Math.min(settings.retentionDays, limits.maxRetentionDays),
  };
}

describe('Pro vs Free Tier Gating', () => {
  describe('limits', () => {
    it('should enforce free tier item limits', () => {
      const limits = getEffectiveLimits(false);
      expect(limits.maxItems).toBe(500);
      expect(limits.maxRetentionDays).toBe(30);
      expect(limits.maxCollections).toBe(3);
    });

    it('should provide full Pro tier limits', () => {
      const limits = getEffectiveLimits(true);
      expect(limits.maxItems).toBe(100_000);
      expect(limits.maxRetentionDays).toBe(3650);
      expect(limits.maxCollections).toBe(1000);
    });

    it('should have meaningful differences between tiers', () => {
      const free = getEffectiveLimits(false);
      const pro = getEffectiveLimits(true);
      expect(pro.maxItems).toBeGreaterThan(free.maxItems);
      expect(pro.maxRetentionDays).toBeGreaterThan(free.maxRetentionDays);
      expect(pro.maxCollections).toBeGreaterThan(free.maxCollections);
    });
  });

  describe('citation style gating', () => {
    it('should allow "none" for free users', () => {
      expect(getEffectiveCitationStyle('none', false)).toBe('none');
    });

    it('should allow "url" for free users', () => {
      expect(getEffectiveCitationStyle('url', false)).toBe('url');
    });

    it('should downgrade "formatted" to "url" for free users', () => {
      expect(getEffectiveCitationStyle('formatted', false)).toBe('url');
    });

    it('should allow "formatted" for Pro users', () => {
      expect(getEffectiveCitationStyle('formatted', true)).toBe('formatted');
    });

    it('should allow "none" for Pro users', () => {
      expect(getEffectiveCitationStyle('none', true)).toBe('none');
    });

    it('should allow "url" for Pro users', () => {
      expect(getEffectiveCitationStyle('url', true)).toBe('url');
    });
  });

  describe('PDF cleanup gating', () => {
    it('should not run PDF cleanup for free users even if enabled', () => {
      expect(shouldRunPdfCleanup(true, false)).toBe(false);
    });

    it('should not run PDF cleanup for Pro users when disabled', () => {
      expect(shouldRunPdfCleanup(false, true)).toBe(false);
    });

    it('should run PDF cleanup for Pro users when enabled', () => {
      expect(shouldRunPdfCleanup(true, true)).toBe(true);
    });

    it('should not run PDF cleanup when both disabled and free', () => {
      expect(shouldRunPdfCleanup(false, false)).toBe(false);
    });
  });

  describe('options page control states', () => {
    it('should disable Pro-only controls for free users', () => {
      const states = getControlStates(false);
      expect(states.pdfCleanupDisabled).toBe(true);
      expect(states.formattedCitationDisabled).toBe(true);
      expect(states.maxItemsCap).toBe(500);
      expect(states.retentionDaysCap).toBe(30);
    });

    it('should enable all controls for Pro users', () => {
      const states = getControlStates(true);
      expect(states.pdfCleanupDisabled).toBe(false);
      expect(states.formattedCitationDisabled).toBe(false);
      expect(states.maxItemsCap).toBe(100000);
      expect(states.retentionDaysCap).toBe(3650);
    });
  });

  describe('settings clamping', () => {
    it('should clamp high values for free users', () => {
      const clamped = clampSettings({ maxItems: 5000, retentionDays: 90 }, false);
      expect(clamped.maxItems).toBe(500);
      expect(clamped.retentionDays).toBe(30);
    });

    it('should not clamp values within free limits', () => {
      const clamped = clampSettings({ maxItems: 200, retentionDays: 14 }, false);
      expect(clamped.maxItems).toBe(200);
      expect(clamped.retentionDays).toBe(14);
    });

    it('should allow high values for Pro users', () => {
      const clamped = clampSettings({ maxItems: 50000, retentionDays: 365 }, true);
      expect(clamped.maxItems).toBe(50000);
      expect(clamped.retentionDays).toBe(365);
    });

    it('should clamp values exceeding even Pro limits', () => {
      const clamped = clampSettings({ maxItems: 200000, retentionDays: 5000 }, true);
      expect(clamped.maxItems).toBe(100000);
      expect(clamped.retentionDays).toBe(3650);
    });
  });

  describe('collection color cycling', () => {
    it('should have at least 5 distinct colors', () => {
      expect(COLLECTION_COLORS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have all unique colors', () => {
      const unique = new Set(COLLECTION_COLORS);
      expect(unique.size).toBe(COLLECTION_COLORS.length);
    });

    it('should cycle colors correctly', () => {
      for (let i = 0; i < COLLECTION_COLORS.length * 3; i++) {
        const colorIndex = i % COLLECTION_COLORS.length;
        expect(COLLECTION_COLORS[colorIndex]).toBeDefined();
        expect(COLLECTION_COLORS[colorIndex]).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe('default settings', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_SETTINGS.enabled).toBe(true);
      expect(DEFAULT_SETTINGS.defaultMode).toBe('auto');
      expect(DEFAULT_SETTINGS.clipboardHistoryEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.watermarkStripping).toBe(true);
      expect(DEFAULT_SETTINGS.showNotifications).toBe(true);
    });

    it('should default to free-tier-compatible citation', () => {
      // Default should be 'url' which is available to free users
      expect(DEFAULT_SETTINGS.autoCitation).toBe('url');
    });

    it('should default PDF cleanup to disabled', () => {
      expect(DEFAULT_SETTINGS.pdfCleanup).toBe(false);
    });

    it('should default paste format to plain', () => {
      expect(DEFAULT_SETTINGS.defaultPasteFormat).toBe('plain');
    });

    it('should have reasonable default limits', () => {
      // Defaults should be high (Pro-level) since clamping happens at the options page
      expect(DEFAULT_SETTINGS.maxItems).toBeGreaterThanOrEqual(500);
      expect(DEFAULT_SETTINGS.retentionDays).toBeGreaterThanOrEqual(30);
    });
  });

  describe('ProStatus shape', () => {
    it('should have correct shape for free user', () => {
      const status: ProStatus = { isPro: false, trialActive: false, trialDaysLeft: 0 };
      expect(status.isPro).toBe(false);
      expect(status.trialActive).toBe(false);
      expect(status.trialDaysLeft).toBe(0);
    });

    it('should have correct shape for Pro user', () => {
      const status: ProStatus = { isPro: true, trialActive: false, trialDaysLeft: 0 };
      expect(status.isPro).toBe(true);
    });

    it('should have correct shape for trial user', () => {
      const status: ProStatus = { isPro: true, trialActive: true, trialDaysLeft: 5 };
      expect(status.isPro).toBe(true);
      expect(status.trialActive).toBe(true);
      expect(status.trialDaysLeft).toBe(5);
    });
  });
});
