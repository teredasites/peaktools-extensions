/**
 * Premium lock/unlock visual animation.
 * Uses Shadow DOM for complete style isolation from the host page.
 * Only runs in the top frame — iframe guard is in main.ts.
 */

const ANIMATION_DURATION = 1800; // ms total
const HOST_ID = 'copyunlock-lock-host';

// Active cleanup timer — so rapid toggles don't leave orphaned overlays
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

// SVG paths for locked and unlocked padlock
const UNLOCKED_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="12" y="28" width="40" height="30" rx="4" fill="#172554" stroke="#3b82f6" stroke-width="2"/>
  <path d="M42 28V20C42 14.477 46.477 10 52 10C57.523 10 62 14.477 62 20" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>
  <circle cx="32" cy="42" r="4" fill="#3b82f6"/>
  <line x1="32" y1="46" x2="32" y2="51" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const RELOCKED_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="12" y="28" width="40" height="30" rx="4" fill="#27272a" stroke="#3f3f46" stroke-width="2"/>
  <path d="M22 28V20C22 14.477 26.477 10 32 10C37.523 10 42 14.477 42 20V28" stroke="#ef4444" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>
  <circle cx="32" cy="42" r="4" fill="#ef4444"/>
  <line x1="32" y1="46" x2="32" y2="51" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const STYLES = `
  :host {
    all: initial;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 1;
    transition: opacity 300ms ease;
  }
  :host(.cu-fade-out) { opacity: 0; }

  .cu-lock-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 28px 40px 24px;
    background: rgba(9, 9, 11, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
    transform: scale(0.7);
    transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  :host(.cu-popped) .cu-lock-card {
    transform: scale(1);
  }
  :host(.cu-fade-out) .cu-lock-card {
    transform: scale(0.9);
  }

  .cu-lock-icon {
    width: 56px;
    height: 56px;
    transition: transform 300ms ease;
  }
  .cu-lock-icon.cu-pop {
    animation: cu-pop 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .cu-lock-label {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.3px;
    color: #a1a1aa;
    text-transform: uppercase;
    transition: color 300ms ease;
  }
  .cu-lock-label.cu-unlocked { color: #3b82f6; }
  .cu-lock-label.cu-relocked { color: #ef4444; }

  .cu-lock-bar {
    width: 40px;
    height: 3px;
    border-radius: 3px;
    background: #27272a;
    overflow: hidden;
    margin-top: -4px;
  }
  .cu-lock-bar-fill {
    width: 0%;
    height: 100%;
    border-radius: 3px;
    background: #3b82f6;
    transition: width 600ms ease;
  }
  .cu-lock-bar-fill.cu-relocked {
    background: #ef4444;
  }
  .cu-lock-bar-fill.cu-done { width: 100%; }

  @keyframes cu-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
`;

function cleanup(): void {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();
}

export function showLockAnimation(unlocking: boolean): void {
  // Guard: need document.body to exist
  if (!document.body) return;

  // Kill any existing animation first (handles rapid toggles)
  cleanup();

  // Create a shadow host element
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';

  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  // Build card
  const card = document.createElement('div');
  card.className = 'cu-lock-card';

  const icon = document.createElement('div');
  icon.className = 'cu-lock-icon';
  icon.innerHTML = unlocking ? UNLOCKED_SVG : RELOCKED_SVG;

  const label = document.createElement('div');
  label.className = 'cu-lock-label';
  label.textContent = unlocking ? 'Unlocked' : 'Locked';
  label.classList.add(unlocking ? 'cu-unlocked' : 'cu-relocked');

  const bar = document.createElement('div');
  bar.className = 'cu-lock-bar';
  const barFill = document.createElement('div');
  barFill.className = 'cu-lock-bar-fill';
  if (!unlocking) barFill.classList.add('cu-relocked');
  bar.appendChild(barFill);

  card.appendChild(icon);
  card.appendChild(label);
  card.appendChild(bar);
  shadow.appendChild(card);
  document.body.appendChild(host);

  // Phase 1: pop the card in (next frame so CSS transition triggers)
  requestAnimationFrame(() => {
    // The :host styles handle the overlay positioning via the shadow DOM
    // But we need the host element itself to be the overlay container
    host.style.cssText = `
      all: initial;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 1;
      transition: opacity 300ms ease;
    `;

    requestAnimationFrame(() => {
      card.style.transform = 'scale(1)';

      // Phase 2: pop the icon + fill bar (200ms)
      setTimeout(() => {
        icon.classList.add('cu-pop');
        barFill.classList.add('cu-done');
      }, 200);

      // Phase 3: fade out (1200ms)
      setTimeout(() => {
        host.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
      }, 1200);

      // Phase 4: remove from DOM
      cleanupTimer = setTimeout(() => {
        cleanup();
      }, ANIMATION_DURATION);
    });
  });
}
