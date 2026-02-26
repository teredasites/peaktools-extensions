import '../setup';

// Safe mode types
interface SafeModeRule {
  domain?: string | RegExp;
  events: string[];
  keys?: string[];
  action: 'preserve' | 'allow';
  reason: string;
}

// Safe mode rules — events and keys that should NOT be intercepted on specific sites
const SAFE_MODE_RULES: SafeModeRule[] = [
  {
    events: ['keydown'],
    keys: ['Enter', 'Tab'],
    action: 'preserve',
    reason: 'Enter and Tab are essential for form interaction',
  },
  {
    domain: /youtube\.com$/,
    events: ['keydown'],
    keys: ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'k', 'j', 'l', 'f', 'm'],
    action: 'preserve',
    reason: 'YouTube player keyboard shortcuts',
  },
  {
    domain: /netflix\.com$/,
    events: ['keydown'],
    keys: ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
    action: 'preserve',
    reason: 'Netflix player keyboard shortcuts',
  },
  {
    domain: /docs\.google\.com$/,
    events: ['contextmenu'],
    action: 'preserve',
    reason: 'Google Docs uses custom context menu',
  },
];

function shouldPreserveEvent(event: string, key: string | undefined, domain: string): boolean {
  for (const rule of SAFE_MODE_RULES) {
    if (!rule.events.includes(event)) continue;

    // Check domain constraint
    if (rule.domain) {
      const domainPattern = rule.domain instanceof RegExp ? rule.domain : new RegExp(rule.domain);
      if (!domainPattern.test(domain)) continue;
    }

    // Check key constraint
    if (rule.keys) {
      if (!key || !rule.keys.includes(key)) continue;
    }

    return true;
  }
  return false;
}

function isSafeDomain(domain: string): boolean {
  const safeDomains = [
    'youtube.com',
    'netflix.com',
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
    'github.com',
    'stackoverflow.com',
  ];
  return safeDomains.some((d) => domain.endsWith(d));
}

function getSafeModeWarnings(domain: string): string[] {
  const warnings: string[] = [];
  for (const rule of SAFE_MODE_RULES) {
    if (rule.domain) {
      const domainPattern = rule.domain instanceof RegExp ? rule.domain : new RegExp(rule.domain);
      if (domainPattern.test(domain)) {
        warnings.push(rule.reason);
      }
    }
  }
  return warnings;
}

// Tests
describe('SafeMode', () => {
  describe('shouldPreserveEvent', () => {
    it('should preserve Enter key globally', () => {
      expect(shouldPreserveEvent('keydown', 'Enter', 'example.com')).toBe(true);
    });

    it('should preserve Tab key globally', () => {
      expect(shouldPreserveEvent('keydown', 'Tab', 'example.com')).toBe(true);
    });

    it('should preserve Space on YouTube', () => {
      expect(shouldPreserveEvent('keydown', 'Space', 'www.youtube.com')).toBe(true);
    });

    it('should preserve ArrowLeft on YouTube', () => {
      expect(shouldPreserveEvent('keydown', 'ArrowLeft', 'www.youtube.com')).toBe(true);
    });

    it('should preserve ArrowRight on Netflix', () => {
      expect(shouldPreserveEvent('keydown', 'ArrowRight', 'www.netflix.com')).toBe(true);
    });

    it('should preserve contextmenu on Google Docs', () => {
      expect(shouldPreserveEvent('contextmenu', undefined, 'docs.google.com')).toBe(true);
    });

    it('should not preserve random keydown events', () => {
      expect(shouldPreserveEvent('keydown', 'x', 'example.com')).toBe(false);
    });

    it('should not preserve copy event (not in rules)', () => {
      expect(shouldPreserveEvent('copy', undefined, 'example.com')).toBe(false);
    });
  });

  describe('isSafeDomain', () => {
    it('should recognize YouTube as a safe domain', () => {
      expect(isSafeDomain('www.youtube.com')).toBe(true);
    });

    it('should recognize GitHub as a safe domain', () => {
      expect(isSafeDomain('github.com')).toBe(true);
    });

    it('should not recognize random domains', () => {
      expect(isSafeDomain('example.com')).toBe(false);
    });
  });

  describe('getSafeModeWarnings', () => {
    it('should return warnings for YouTube', () => {
      const warnings = getSafeModeWarnings('www.youtube.com');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('YouTube');
    });

    it('should return warnings for Google Docs', () => {
      const warnings = getSafeModeWarnings('docs.google.com');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Google Docs');
    });

    it('should return empty for unknown domains', () => {
      const warnings = getSafeModeWarnings('example.com');
      expect(warnings).toHaveLength(0);
    });
  });
});
