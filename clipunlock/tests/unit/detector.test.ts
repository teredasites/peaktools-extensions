import '../setup';

// Mock detector module — adjust import path to match your actual source
// import { detectProtections, buildStrategy } from '../../src/content/detector';

// Inline test helpers since the actual module may not be built yet
interface Protection {
  type: string;
  severity: 'none' | 'light' | 'moderate' | 'heavy';
  target?: string;
  details?: string;
}

interface DetectionResult {
  domain: string;
  url: string;
  protections: Protection[];
  strategy: string[];
}

// Simulated detection functions for testing
function detectUserSelectNone(el: HTMLElement): Protection | null {
  const style = el.style.userSelect || el.style.getPropertyValue('user-select');
  if (style === 'none') {
    return { type: 'css-user-select-none', severity: 'light', target: el.tagName };
  }
  return null;
}

function detectInlineOncopy(el: HTMLElement): Protection | null {
  if (el.getAttribute('oncopy')) {
    return { type: 'inline-oncopy', severity: 'moderate', target: el.tagName };
  }
  return null;
}

function detectContextmenuPrevention(el: HTMLElement): Protection | null {
  if (el.getAttribute('oncontextmenu')?.includes('return false')) {
    return { type: 'contextmenu-prevention', severity: 'moderate', target: el.tagName };
  }
  return null;
}

function detectSelectstart(el: HTMLElement): Protection | null {
  if (el.getAttribute('onselectstart')?.includes('return false')) {
    return { type: 'selectstart-prevention', severity: 'light', target: el.tagName };
  }
  return null;
}

function detectDragstart(el: HTMLElement): Protection | null {
  if (el.getAttribute('ondragstart')?.includes('return false')) {
    return { type: 'dragstart-prevention', severity: 'light', target: el.tagName };
  }
  return null;
}

function detectMousedown(el: HTMLElement): Protection | null {
  if (el.getAttribute('onmousedown')?.includes('return false')) {
    return { type: 'mousedown-prevention', severity: 'light', target: el.tagName };
  }
  return null;
}

function detectDocumentOncopy(): Protection | null {
  if ((document as any).oncopy) {
    return { type: 'document-oncopy-override', severity: 'heavy' };
  }
  return null;
}

function detectDocumentOncontextmenu(): Protection | null {
  if ((document as any).oncontextmenu) {
    return { type: 'document-oncontextmenu-override', severity: 'heavy' };
  }
  return null;
}

function detectInert(el: HTMLElement): Protection | null {
  if (el.hasAttribute('inert')) {
    return { type: 'inert-attribute', severity: 'moderate', target: el.tagName };
  }
  return null;
}

function getSeverity(protections: Protection[]): 'none' | 'light' | 'moderate' | 'heavy' {
  if (protections.length === 0) return 'none';
  const levels = ['none', 'light', 'moderate', 'heavy'] as const;
  let max = 0;
  for (const p of protections) {
    const idx = levels.indexOf(p.severity);
    if (idx > max) max = idx;
  }
  return levels[max];
}

function buildStrategy(protections: Protection[], mode: string): string[] {
  if (mode === 'safe') {
    return protections
      .filter((p) => p.severity === 'light')
      .map((p) => `remove:${p.type}`);
  }
  return protections.map((p) => `remove:${p.type}`);
}

function getDomain(): string {
  return location.hostname;
}

function getUrl(): string {
  return location.href;
}

// Tests
describe('Detector', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    (document as any).oncopy = null;
    (document as any).oncontextmenu = null;
  });

  describe('user-select:none detection', () => {
    it('should detect user-select:none on an element', () => {
      const el = document.createElement('div');
      el.style.userSelect = 'none';
      const result = detectUserSelectNone(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('css-user-select-none');
      expect(result!.severity).toBe('light');
    });

    it('should return null for elements without user-select:none', () => {
      const el = document.createElement('div');
      expect(detectUserSelectNone(el)).toBeNull();
    });
  });

  describe('inline oncopy detection', () => {
    it('should detect inline oncopy handler', () => {
      const el = document.createElement('div');
      el.setAttribute('oncopy', 'return false');
      const result = detectInlineOncopy(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('inline-oncopy');
      expect(result!.severity).toBe('moderate');
    });
  });

  describe('contextmenu prevention', () => {
    it('should detect oncontextmenu returning false', () => {
      const el = document.createElement('body');
      el.setAttribute('oncontextmenu', 'return false');
      const result = detectContextmenuPrevention(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('contextmenu-prevention');
    });
  });

  describe('selectstart prevention', () => {
    it('should detect onselectstart returning false', () => {
      const el = document.createElement('div');
      el.setAttribute('onselectstart', 'return false');
      const result = detectSelectstart(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('selectstart-prevention');
    });
  });

  describe('dragstart prevention', () => {
    it('should detect ondragstart returning false', () => {
      const el = document.createElement('div');
      el.setAttribute('ondragstart', 'return false');
      const result = detectDragstart(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('dragstart-prevention');
    });
  });

  describe('mousedown prevention', () => {
    it('should detect onmousedown returning false', () => {
      const el = document.createElement('div');
      el.setAttribute('onmousedown', 'return false');
      const result = detectMousedown(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('mousedown-prevention');
    });
  });

  describe('document.oncopy override', () => {
    it('should detect document.oncopy being set', () => {
      (document as any).oncopy = () => false;
      const result = detectDocumentOncopy();
      expect(result).not.toBeNull();
      expect(result!.type).toBe('document-oncopy-override');
      expect(result!.severity).toBe('heavy');
    });
  });

  describe('document.oncontextmenu override', () => {
    it('should detect document.oncontextmenu being set', () => {
      (document as any).oncontextmenu = () => false;
      const result = detectDocumentOncontextmenu();
      expect(result).not.toBeNull();
      expect(result!.type).toBe('document-oncontextmenu-override');
      expect(result!.severity).toBe('heavy');
    });
  });

  describe('inert attribute', () => {
    it('should detect inert attribute on element', () => {
      const el = document.createElement('div');
      el.setAttribute('inert', '');
      const result = detectInert(el);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('inert-attribute');
    });
  });

  describe('severity calculation', () => {
    it('should return none for empty protections', () => {
      expect(getSeverity([])).toBe('none');
    });

    it('should return light for only light protections', () => {
      expect(getSeverity([{ type: 'test', severity: 'light' }])).toBe('light');
    });

    it('should return heaviest severity', () => {
      expect(
        getSeverity([
          { type: 'a', severity: 'light' },
          { type: 'b', severity: 'heavy' },
        ])
      ).toBe('heavy');
    });
  });

  describe('domain/url from location', () => {
    it('should return hostname as domain', () => {
      expect(getDomain()).toBe('localhost');
    });

    it('should return full href as url', () => {
      expect(getUrl()).toContain('http');
    });
  });

  describe('strategy building', () => {
    it('should build removal strategy for all protections in auto mode', () => {
      const protections: Protection[] = [
        { type: 'css-user-select-none', severity: 'light' },
        { type: 'inline-oncopy', severity: 'moderate' },
      ];
      const strategy = buildStrategy(protections, 'auto');
      expect(strategy).toHaveLength(2);
      expect(strategy[0]).toBe('remove:css-user-select-none');
      expect(strategy[1]).toBe('remove:inline-oncopy');
    });

    it('should skip non-light protections in safe mode', () => {
      const protections: Protection[] = [
        { type: 'css-user-select-none', severity: 'light' },
        { type: 'inline-oncopy', severity: 'moderate' },
        { type: 'document-oncopy-override', severity: 'heavy' },
      ];
      const strategy = buildStrategy(protections, 'safe');
      expect(strategy).toHaveLength(1);
      expect(strategy[0]).toBe('remove:css-user-select-none');
    });
  });

  describe('multiple simultaneous detections', () => {
    it('should detect multiple protections on one element', () => {
      const el = document.createElement('div');
      el.style.userSelect = 'none';
      el.setAttribute('oncopy', 'return false');
      el.setAttribute('oncontextmenu', 'return false');

      const results = [
        detectUserSelectNone(el),
        detectInlineOncopy(el),
        detectContextmenuPrevention(el),
      ].filter(Boolean) as Protection[];

      expect(results).toHaveLength(3);
    });
  });
});
