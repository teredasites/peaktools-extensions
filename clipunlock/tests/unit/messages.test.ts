import { vi } from 'vitest';
import '../setup';
import { chromeMock, messageListeners } from '../setup';

// Message types
type MessageType =
  | 'GET_TAB_STATE'
  | 'TOGGLE_UNLOCK'
  | 'SET_MODE'
  | 'GET_RECENT_ITEMS'
  | 'GET_ALL_ITEMS'
  | 'COPY_ITEM'
  | 'TOGGLE_PIN'
  | 'DELETE_ITEM'
  | 'CLEAR_ALL_ITEMS'
  | 'SETTINGS_CHANGED'
  | 'OFFSCREEN_COPY'
  | 'OFFSCREEN_READ_CLIPBOARD'
  | 'OPEN_UPGRADE';

interface Message {
  type: MessageType;
  payload?: any;
}

// Message helpers
function sendMessage(message: Message): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

function onMessage(callback: (message: Message, sender: any, sendResponse: (r: any) => void) => void): void {
  chrome.runtime.onMessage.addListener(callback);
}

// Tests
describe('Messages', () => {
  beforeEach(() => {
    chromeMock.runtime.sendMessage.mockClear();
    chromeMock.runtime.onMessage.addListener.mockClear();
    // Clear any registered listeners
    messageListeners.length = 0;
  });

  describe('sendMessage', () => {
    it('should call chrome.runtime.sendMessage', async () => {
      const message: Message = { type: 'GET_TAB_STATE', payload: { tabId: 1 } };
      await sendMessage(message);
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should pass correct message type', async () => {
      await sendMessage({ type: 'TOGGLE_UNLOCK', payload: { tabId: 1, enabled: true } });
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TOGGLE_UNLOCK' })
      );
    });

    it('should handle messages without payload', async () => {
      await sendMessage({ type: 'GET_RECENT_ITEMS' });
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_RECENT_ITEMS' });
    });
  });

  describe('onMessage', () => {
    it('should register a listener via chrome.runtime.onMessage.addListener', () => {
      const listener = vi.fn();
      onMessage(listener);
      expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });

    it('should add listener to messageListeners array', () => {
      const listener = vi.fn();
      onMessage(listener);
      expect(messageListeners).toContain(listener);
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      onMessage(listener1);
      onMessage(listener2);
      expect(messageListeners).toHaveLength(2);
    });
  });

  describe('message types', () => {
    it('should properly type GET_TAB_STATE message', () => {
      const msg: Message = { type: 'GET_TAB_STATE', payload: { tabId: 1 } };
      expect(msg.type).toBe('GET_TAB_STATE');
      expect(msg.payload.tabId).toBe(1);
    });

    it('should properly type TOGGLE_UNLOCK message', () => {
      const msg: Message = { type: 'TOGGLE_UNLOCK', payload: { tabId: 1, enabled: true } };
      expect(msg.type).toBe('TOGGLE_UNLOCK');
      expect(msg.payload.enabled).toBe(true);
    });

    it('should properly type SET_MODE message', () => {
      const msg: Message = { type: 'SET_MODE', payload: { tabId: 1, mode: 'aggressive' } };
      expect(msg.type).toBe('SET_MODE');
      expect(msg.payload.mode).toBe('aggressive');
    });

    it('should properly type OFFSCREEN_COPY message', () => {
      const msg: Message = { type: 'OFFSCREEN_COPY', payload: { text: 'hello' } };
      expect(msg.type).toBe('OFFSCREEN_COPY');
      expect(msg.payload.text).toBe('hello');
    });

    it('should properly type SETTINGS_CHANGED message', () => {
      const msg: Message = {
        type: 'SETTINGS_CHANGED',
        payload: { enabled: true, defaultMode: 'auto' },
      };
      expect(msg.type).toBe('SETTINGS_CHANGED');
    });

    it('should properly type CLEAR_ALL_ITEMS message', () => {
      const msg: Message = { type: 'CLEAR_ALL_ITEMS' };
      expect(msg.type).toBe('CLEAR_ALL_ITEMS');
      expect(msg.payload).toBeUndefined();
    });
  });
});
