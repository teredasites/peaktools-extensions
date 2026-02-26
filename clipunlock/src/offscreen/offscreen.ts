// Offscreen document for clipboard operations
// Required because Manifest V3 service workers cannot access the DOM clipboard API

const clipboardArea = document.getElementById('clipboard-area') as HTMLTextAreaElement;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OFFSCREEN_COPY') {
    handleCopy(message.payload?.text || '')
      .then((success) => sendResponse({ success }))
      .catch(() => sendResponse({ success: false }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'OFFSCREEN_READ_CLIPBOARD') {
    handleReadClipboard()
      .then((text) => sendResponse({ text }))
      .catch(() => sendResponse({ text: '' }));
    return true;
  }
});

async function handleCopy(text: string): Promise<boolean> {
  try {
    // Method 1: Use textarea + execCommand (works in offscreen docs)
    clipboardArea.value = text;
    clipboardArea.select();
    clipboardArea.setSelectionRange(0, text.length);
    const success = document.execCommand('copy');
    clipboardArea.value = '';
    return success;
  } catch {
    try {
      // Method 2: Fallback to Clipboard API
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

async function handleReadClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch {
    return '';
  }
}
