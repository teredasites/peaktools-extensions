import '../setup';
import { chromeMock } from '../setup';

// Simulated tab state manager
class TabStateManager {
  private states: Map<number, { unlocked: boolean; mode: string; protectionsRemoved: number }> = new Map();

  getState(tabId: number) {
    return this.states.get(tabId) || { unlocked: false, mode: 'auto', protectionsRemoved: 0 };
  }

  toggle(tabId: number, enabled: boolean): { unlocked: boolean; mode: string; protectionsRemoved: number } {
    const current = this.getState(tabId);
    const newState = { ...current, unlocked: enabled };
    this.states.set(tabId, newState);
    return newState;
  }

  setMode(tabId: number, mode: string): void {
    const current = this.getState(tabId);
    this.states.set(tabId, { ...current, mode });
  }

  clear(): void {
    this.states.clear();
  }
}

describe('Chaos Test - Rapid Toggle', () => {
  let manager: TabStateManager;

  beforeEach(() => {
    manager = new TabStateManager();
  });

  it('should handle 1000 rapid toggles without errors', () => {
    const tabId = 1;
    let lastState: { unlocked: boolean } = { unlocked: false };

    expect(() => {
      for (let i = 0; i < 1000; i++) {
        const enabled = i % 2 === 0;
        lastState = manager.toggle(tabId, enabled);
      }
    }).not.toThrow();

    // After 1000 toggles (0-999), last toggle is i=999 -> 999 % 2 === 1 -> enabled = false
    // Wait, let's check: i=0 -> enabled=true, i=1 -> enabled=false, ..., i=999 -> enabled=false
    // Actually: 999 % 2 = 1, so enabled = false
    expect(lastState.unlocked).toBe(false);
  });

  it('should have deterministic final state for even number of toggles', () => {
    const tabId = 2;

    // 100 toggles (even count)
    for (let i = 0; i < 100; i++) {
      manager.toggle(tabId, i % 2 === 0);
    }

    const state = manager.getState(tabId);
    // i=99 -> 99 % 2 = 1 -> enabled = false
    expect(state.unlocked).toBe(false);
  });

  it('should have deterministic final state for odd number of toggles', () => {
    const tabId = 3;

    // 101 toggles (odd count)
    for (let i = 0; i < 101; i++) {
      manager.toggle(tabId, i % 2 === 0);
    }

    const state = manager.getState(tabId);
    // i=100 -> 100 % 2 = 0 -> enabled = true
    expect(state.unlocked).toBe(true);
  });

  it('should handle rapid mode switching during toggles', () => {
    const tabId = 4;
    const modes = ['auto', 'safe', 'aggressive'];

    expect(() => {
      for (let i = 0; i < 1000; i++) {
        manager.toggle(tabId, i % 2 === 0);
        manager.setMode(tabId, modes[i % 3]);
      }
    }).not.toThrow();

    const state = manager.getState(tabId);
    // i=999: mode = modes[999 % 3] = modes[0] = 'auto'
    expect(state.mode).toBe('auto');
  });

  it('should handle toggles across multiple tabs', () => {
    expect(() => {
      for (let tabId = 1; tabId <= 100; tabId++) {
        for (let i = 0; i < 10; i++) {
          manager.toggle(tabId, i % 2 === 0);
        }
      }
    }).not.toThrow();

    // Each tab had 10 toggles, last was i=9 -> enabled = false
    for (let tabId = 1; tabId <= 100; tabId++) {
      expect(manager.getState(tabId).unlocked).toBe(false);
    }
  });
});
