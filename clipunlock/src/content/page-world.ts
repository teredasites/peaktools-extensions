// ─── CopyUnlock Page World Script ───
// Runs in the MAIN world (page's JavaScript context) via manifest "world": "MAIN"
// No chrome.* APIs available. Communicates with ISOLATED world via CustomEvents.
// This avoids CSP inline script violations entirely.

(function () {
  // Store originals BEFORE any page scripts run (document_start)
  const origAddEventListener = EventTarget.prototype.addEventListener;
  const origRemoveEventListener = EventTarget.prototype.removeEventListener;
  const origRemoveAllRanges = Selection.prototype.removeAllRanges;
  const origEmpty = Selection.prototype.empty;
  const origGetSelection = window.getSelection;

  // ─── Auto-tracker: capture copy-related addEventListener calls ───
  const tracked: Array<{ type: string; target: string }> = [];
  const COPY_EVENTS_SET = new Set(['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'mousedown', 'dragstart']);
  const MAX_TRACKED = 500; // Cap tracked entries to prevent memory bloat on heavy sites

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (tracked.length < MAX_TRACKED && COPY_EVENTS_SET.has(type)) {
      try {
        tracked.push({
          type: type,
          target:
            this === document
              ? 'document'
              : this === window
                ? 'window'
                : (this as Element).tagName || 'unknown',
        });
      } catch {
        // Some exotic EventTarget subclasses (MediaSource, AudioNode, etc.)
        // may throw on property access — silently skip tracking
      }
    }
    return origAddEventListener.call(this, type, listener, options);
  };

  Object.defineProperty(window, '__copyunlock_tracked_listeners', {
    value: tracked,
    writable: false,
    configurable: false,
  });
  (window as Record<string, unknown>).__copyunlock_orig_addEventListener = origAddEventListener;

  // ─── State for removeAllRanges protection ───
  let selectionProtectedUntil = 0;
  let removeAllRangesPatched = false;

  // ─── Master kill-switch: all capture-phase blockers check this ───
  let unlockActive = false;

  // ─── Saved document handlers for revert ───
  let savedDocHandlers: {
    oncopy: typeof document.oncopy;
    oncut: typeof document.oncut;
    onpaste: typeof document.onpaste;
    oncontextmenu: typeof document.oncontextmenu;
    onselectstart: typeof document.onselectstart;
  } | null = null;

  // ─── Saved prototype descriptors for revert ───
  let origInputDesc: PropertyDescriptor | undefined;
  let origTextareaDesc: PropertyDescriptor | undefined;
  let inputOverridden = false;

  // ─── Command handler: ISOLATED world dispatches events, we execute here ───
  window.addEventListener('__copyunlock_cmd', function (e: Event) {
    const detail = (e as CustomEvent).detail;
    if (!detail || !detail.action) return;

    try { switch (detail.action) {
      case 'prototype-intercept': {
        unlockActive = true;
        const blocked = new Set(['copy', 'cut', 'paste', 'contextmenu', 'selectstart']);
        const storedListeners: Array<{ target: EventTarget; type: string; fn: EventListenerOrEventListenerObject; opts: unknown }> = [];
        EventTarget.prototype.addEventListener = function (
          this: EventTarget,
          type: string,
          fn: EventListenerOrEventListenerObject,
          opts?: boolean | AddEventListenerOptions,
        ) {
          if (unlockActive && blocked.has(type)) {
            storedListeners.push({ target: this, type, fn, opts });
            return;
          }
          return origAddEventListener.call(this, type, fn, opts);
        };
        (window as Record<string, unknown>).__copyunlock_blocked_listeners = storedListeners;
        break;
      }

      case 'selective-intercept': {
        unlockActive = true;
        // Capture phase: block keydown for Ctrl+C/X/V/A from site scripts
        origAddEventListener.call(
          document,
          'keydown',
          function (ev: Event) {
            if (!unlockActive) return;
            const ke = ev as KeyboardEvent;
            if ((ke.ctrlKey || ke.metaKey) && (ke.key === 'c' || ke.key === 'x' || ke.key === 'v' || ke.key === 'a')) {
              ke.stopImmediatePropagation();
            }
          },
          true,
        );

        // Capture phase: block copy/cut/paste/contextmenu/selectstart/dragstart propagation
        ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach(function (evtType) {
          origAddEventListener.call(
            document,
            evtType,
            function (ev: Event) {
              if (!unlockActive) return;
              ev.stopImmediatePropagation();
            },
            true,
          );
        });

        // Capture phase: block mousedown only on non-interactive elements (text selection targets)
        origAddEventListener.call(
          document,
          'mousedown',
          function (ev: Event) {
            if (!unlockActive) return;
            const target = ev.target as HTMLElement;
            if (!target) return;
            const tag = target.tagName;
            // Don't block clicks on interactive elements
            if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' ||
                tag === 'SELECT' || tag === 'LABEL' || tag === 'SUMMARY' ||
                target.getAttribute('role') === 'button' || target.getAttribute('role') === 'link' ||
                target.closest('a, button, input, textarea, select, [role="button"], [role="link"]')) {
              return;
            }
            ev.stopImmediatePropagation();
          },
          true,
        );
        break;
      }

      case 'force-enable-paste': {
        unlockActive = true;
        origAddEventListener.call(
          document,
          'paste',
          function (ev: Event) {
            if (!unlockActive) return;
            const ce = ev as ClipboardEvent;
            const target = ce.target as HTMLInputElement | HTMLTextAreaElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
              ce.stopImmediatePropagation();

              let wasPrevented = false;
              ce.preventDefault = function () {
                wasPrevented = true;
              };

              setTimeout(function () {
                if (wasPrevented && ce.clipboardData) {
                  const text = ce.clipboardData.getData('text/plain');
                  if (text && target.value !== undefined) {
                    const start = target.selectionStart || 0;
                    const end = target.selectionEnd || 0;
                    target.value = target.value.substring(0, start) + text + target.value.substring(end);
                    target.selectionStart = target.selectionEnd = start + text.length;
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }
              }, 0);
            }
          },
          true,
        );

        // Remove maxlength restrictions
        document.querySelectorAll('input[maxlength], textarea[maxlength]').forEach(function (el) {
          el.removeAttribute('maxlength');
        });
        break;
      }

      case 'null-handler': {
        unlockActive = true;
        // Save originals before nulling
        savedDocHandlers = {
          oncopy: document.oncopy,
          oncut: document.oncut,
          onpaste: document.onpaste,
          oncontextmenu: document.oncontextmenu,
          onselectstart: document.onselectstart,
        };
        document.oncopy = null;
        document.oncut = null;
        document.onpaste = null;
        document.oncontextmenu = null;
        document.onselectstart = null;
        break;
      }

      case 'override-removeAllRanges': {
        unlockActive = true;
        if (removeAllRangesPatched) break;
        removeAllRangesPatched = true;

        // Track user interaction — protect selections for 3s after any selection-related action
        const extendProtection = function () {
          if (!unlockActive) return;
          selectionProtectedUntil = Date.now() + 3000;
        };

        // Mousedown = user starting to select
        origAddEventListener.call(document, 'mousedown', extendProtection, true);
        // Mouseup = user just finished selecting — protect for 3s after
        origAddEventListener.call(document, 'mouseup', extendProtection, true);
        // Keyboard selection (Shift+Arrow, Shift+Home/End, Ctrl+A)
        origAddEventListener.call(
          document,
          'keydown',
          function (ev: Event) {
            if (!unlockActive) return;
            const ke = ev as KeyboardEvent;
            if (ke.shiftKey || ((ke.ctrlKey || ke.metaKey) && ke.key === 'a')) {
              extendProtection();
            }
          },
          true,
        );
        // Context menu = user right-clicked, likely wants to copy selection
        origAddEventListener.call(document, 'contextmenu', extendProtection, true);
        // Touch events for mobile selection
        origAddEventListener.call(document, 'touchstart', extendProtection, true);
        origAddEventListener.call(document, 'touchend', extendProtection, true);

        // Core guard: block removeAllRanges if there's a non-empty selection and user is interacting
        function shouldBlock(sel: Selection): boolean {
          if (!unlockActive) return false;
          // Always protect non-empty selections during the protection window
          if (Date.now() < selectionProtectedUntil) {
            try { if (sel.toString().length > 0) return true; } catch { /* ignore */ }
            // Even if selection is empty during mousedown phase, block to prevent preemptive clearing
            return true;
          }
          // Outside protection window, still protect non-empty selections
          // (catches programmatic timer-based clearing like Method 12)
          try { if (sel.rangeCount > 0 && sel.toString().length > 0) return true; } catch { /* ignore */ }
          return false;
        }

        Selection.prototype.removeAllRanges = function () {
          if (shouldBlock(this)) return;
          return origRemoveAllRanges.call(this);
        };

        // Also patch Selection.empty() — Chrome alias for removeAllRanges
        if (origEmpty) {
          Selection.prototype.empty = function () {
            if (shouldBlock(this)) return;
            return origEmpty.call(this);
          };
        }
        break;
      }

      case 'prototype-restore': {
        unlockActive = true;
        const native = origGetSelection;
        if (window.getSelection !== native) {
          // Page has overridden getSelection, restore it
          window.getSelection = native;
        }
        break;
      }

      case 'force-input-override': {
        unlockActive = true;
        // Block input event validators that revert paste (e.g. paste length restrictions)
        origAddEventListener.call(
          document,
          'input',
          function (ev: Event) {
            if (!unlockActive) return;
            const ie = ev as InputEvent;
            if (ie.inputType === 'insertFromPaste' || ie.inputType === 'insertFromDrop') {
              ev.stopImmediatePropagation();
            }
          },
          true,
        );

        // Override value setter to block revert within 500ms of a paste
        if (!inputOverridden) {
          inputOverridden = true;
          origInputDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
          origTextareaDesc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        }
        let protectUntil = 0;
        let protectedValue = '';

        origAddEventListener.call(
          document,
          'input',
          function (ev: Event) {
            if (!unlockActive) return;
            const ie = ev as InputEvent;
            if (ie.inputType === 'insertFromPaste' || ie.inputType === 'insertFromDrop') {
              const target = ev.target as HTMLInputElement;
              protectedValue = target.value;
              protectUntil = Date.now() + 500;
            }
          },
          true,
        );

        if (origInputDesc && origInputDesc.set) {
          const origSet = origInputDesc.set;
          Object.defineProperty(HTMLInputElement.prototype, 'value', {
            get: origInputDesc.get,
            set: function (val: string) {
              if (unlockActive && Date.now() < protectUntil && val.length < protectedValue.length) {
                return;
              }
              origSet.call(this, val);
            },
            configurable: true,
            enumerable: true,
          });
        }

        if (origTextareaDesc && origTextareaDesc.set) {
          const origSetTA = origTextareaDesc.set;
          Object.defineProperty(HTMLTextAreaElement.prototype, 'value', {
            get: origTextareaDesc.get,
            set: function (val: string) {
              if (unlockActive && Date.now() < protectUntil && val.length < protectedValue.length) {
                return;
              }
              origSetTA.call(this, val);
            },
            configurable: true,
            enumerable: true,
          });
        }
        break;
      }

      case 'neutralize-alert': {
        unlockActive = true;
        // Override window.alert to no-op while unlock is active
        // Sites use alert() on right-click to annoy users and block context menu
        const origAlert = window.alert;
        window.alert = function (msg?: string) {
          if (unlockActive) return; // swallow alert during unlock
          return origAlert.call(window, msg);
        };
        // Also override window.confirm and window.prompt used by some sites
        const origConfirm = window.confirm;
        window.confirm = function (msg?: string): boolean {
          if (unlockActive) return true;
          return origConfirm.call(window, msg);
        };
        const origPrompt = window.prompt;
        window.prompt = function (msg?: string, def?: string): string | null {
          if (unlockActive) return def ?? '';
          return origPrompt.call(window, msg, def);
        };
        // Store for revert
        (window as Record<string, unknown>).__copyunlock_orig_alert = origAlert;
        (window as Record<string, unknown>).__copyunlock_orig_confirm = origConfirm;
        (window as Record<string, unknown>).__copyunlock_orig_prompt = origPrompt;
        break;
      }

      case 'anti-hijack': {
        unlockActive = true;
        // Intercept copy events in capture phase — if the page's copy listener
        // modifies clipboardData.setData, we re-set it with the real selection text
        origAddEventListener.call(
          document,
          'copy',
          function (ev: Event) {
            if (!unlockActive) return;
            const ce = ev as ClipboardEvent;
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const originalText = sel.toString();
            // After a microtask, check if clipboard was hijacked
            // (page scripts run between capture and bubble phase)
            setTimeout(function () {
              if (!ce.clipboardData) return;
              try {
                const currentData = ce.clipboardData.getData('text/plain');
                // If the data was changed from what the user selected, it was hijacked
                if (currentData && currentData !== originalText && originalText.length > 0) {
                  // Can't fix here — already committed. But we prevent future hijacks below.
                }
              } catch { /* clipboardData may be expired */ }
            }, 0);
          },
          true,
        );

        // Patch DataTransfer.prototype.setData to guard against pastejacking
        const origSetData = DataTransfer.prototype.setData;
        DataTransfer.prototype.setData = function (format: string, data: string) {
          if (unlockActive) {
            // Only allow setData from our own code, block page script hijacking
            // Check if we're in a copy event handler by looking at the call stack
            const sel = window.getSelection();
            const selText = sel ? sel.toString() : '';
            if (selText.length > 0 && data !== selText && format === 'text/plain') {
              // Page is trying to replace selected text with something else — block it
              return origSetData.call(this, format, selText);
            }
          }
          return origSetData.call(this, format, data);
        };
        (window as Record<string, unknown>).__copyunlock_orig_setData = origSetData;
        break;
      }

      case 'neutralize-debugger': {
        unlockActive = true;
        // Override the Function constructor to strip debugger statements
        const OrigFunction = Function;
        const FunctionProxy = new Proxy(OrigFunction, {
          construct(target, args) {
            // Rewrite any Function('debugger') or Function body containing 'debugger'
            if (args.length > 0) {
              const lastArg = String(args[args.length - 1]);
              if (/\bdebugger\b/.test(lastArg)) {
                args[args.length - 1] = lastArg.replace(/\bdebugger\b/g, '/* debugger neutralized */');
              }
            }
            return Reflect.construct(target, args);
          },
          apply(target, thisArg, args) {
            if (args.length > 0) {
              const lastArg = String(args[args.length - 1]);
              if (/\bdebugger\b/.test(lastArg)) {
                args[args.length - 1] = lastArg.replace(/\bdebugger\b/g, '/* debugger neutralized */');
              }
            }
            return Reflect.apply(target, thisArg, args);
          },
        });
        try {
          (window as Record<string, unknown>).Function = FunctionProxy;
        } catch { /* strict mode may prevent this */ }

        // Also patch eval to strip debugger
        const origEval = window.eval;
        (window as Record<string, unknown>).eval = function (code: string) {
          if (unlockActive && typeof code === 'string' && /\bdebugger\b/.test(code)) {
            code = code.replace(/\bdebugger\b/g, '/* debugger neutralized */');
          }
          return origEval.call(window, code);
        };

        // Patch setInterval/setTimeout to strip debugger from string arguments
        const origSetInterval = window.setInterval;
        const origSetTimeout = window.setTimeout;
        (window as Record<string, unknown>).setInterval = function (handler: unknown, ...args: unknown[]) {
          if (unlockActive && typeof handler === 'string' && /\bdebugger\b/.test(handler)) {
            handler = (handler as string).replace(/\bdebugger\b/g, '/* debugger neutralized */');
          }
          return origSetInterval.call(window, handler as TimerHandler, ...args);
        };
        (window as Record<string, unknown>).setTimeout = function (handler: unknown, ...args: unknown[]) {
          if (unlockActive && typeof handler === 'string' && /\bdebugger\b/.test(handler)) {
            handler = (handler as string).replace(/\bdebugger\b/g, '/* debugger neutralized */');
          }
          return origSetTimeout.call(window, handler as TimerHandler, ...args);
        };

        (window as Record<string, unknown>).__copyunlock_orig_eval = origEval;
        (window as Record<string, unknown>).__copyunlock_orig_setInterval = origSetInterval;
        (window as Record<string, unknown>).__copyunlock_orig_setTimeout = origSetTimeout;
        break;
      }

      case 'unblock-print': {
        unlockActive = true;
        // Block key event listeners that prevent Ctrl+P, F12, PrintScreen
        origAddEventListener.call(
          document,
          'keydown',
          function (ev: Event) {
            if (!unlockActive) return;
            const ke = ev as KeyboardEvent;
            // Allow Ctrl+P (print)
            if ((ke.ctrlKey || ke.metaKey) && ke.key === 'p') {
              ke.stopImmediatePropagation();
              return;
            }
            // Allow F12 (devtools)
            if (ke.key === 'F12') {
              ke.stopImmediatePropagation();
              return;
            }
            // Allow PrintScreen
            if (ke.key === 'PrintScreen') {
              ke.stopImmediatePropagation();
              return;
            }
            // Allow Ctrl+Shift+I (devtools)
            if ((ke.ctrlKey || ke.metaKey) && ke.shiftKey && ke.key === 'I') {
              ke.stopImmediatePropagation();
              return;
            }
          },
          true,
        );

        // Also block keyup for the same keys (some sites use keyup)
        origAddEventListener.call(
          document,
          'keyup',
          function (ev: Event) {
            if (!unlockActive) return;
            const ke = ev as KeyboardEvent;
            if ((ke.ctrlKey || ke.metaKey) && ke.key === 'p') ke.stopImmediatePropagation();
            if (ke.key === 'F12') ke.stopImmediatePropagation();
            if (ke.key === 'PrintScreen') ke.stopImmediatePropagation();
          },
          true,
        );

        // Remove beforeprint/afterprint event listeners that hide content
        origAddEventListener.call(window, 'beforeprint', function () {
          if (!unlockActive) return;
          // Force all elements visible during print
          document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]').forEach(function (el) {
            (el as HTMLElement).style.setProperty('display', 'block', 'important');
            (el as HTMLElement).style.setProperty('visibility', 'visible', 'important');
          });
        }, true);
        break;
      }

      case 'get-detection-data': {
        // Bridge MAIN world JS state to ISOLATED world for accurate detection
        let gsOverridden = false;
        try {
          gsOverridden = !!(
            window.getSelection &&
            window.getSelection !== origGetSelection &&
            !window.getSelection.toString().includes('[native code]')
          );
        } catch { /* Function.prototype.toString may be overridden */ }
        const data = {
          trackedListeners: tracked.slice(),
          oncopy: document.oncopy !== null,
          oncut: document.oncut !== null,
          onpaste: document.onpaste !== null,
          oncontextmenu: document.oncontextmenu !== null,
          onselectstart: document.onselectstart !== null,
          getSelectionOverridden: gsOverridden,
        };
        window.dispatchEvent(
          new CustomEvent('__copyunlock_report', { detail: data }),
        );
        break;
      }

      case 'revert': {
        // Kill-switch: all capture-phase listeners now pass through
        unlockActive = false;

        // Restore prototypes
        EventTarget.prototype.addEventListener = origAddEventListener;
        Selection.prototype.removeAllRanges = origRemoveAllRanges;
        if (origEmpty) Selection.prototype.empty = origEmpty;
        window.getSelection = origGetSelection;
        removeAllRangesPatched = false;
        selectionProtectedUntil = 0;

        // Restore document handlers that were nulled
        if (savedDocHandlers) {
          document.oncopy = savedDocHandlers.oncopy;
          document.oncut = savedDocHandlers.oncut;
          document.onpaste = savedDocHandlers.onpaste;
          document.oncontextmenu = savedDocHandlers.oncontextmenu;
          document.onselectstart = savedDocHandlers.onselectstart;
          savedDocHandlers = null;
        }

        // Restore input/textarea value setters
        if (inputOverridden) {
          if (origInputDesc) {
            Object.defineProperty(HTMLInputElement.prototype, 'value', origInputDesc);
          }
          if (origTextareaDesc) {
            Object.defineProperty(HTMLTextAreaElement.prototype, 'value', origTextareaDesc);
          }
          inputOverridden = false;
        }

        // Restore alert/confirm/prompt
        const w = window as Record<string, unknown>;
        if (w.__copyunlock_orig_alert) {
          window.alert = w.__copyunlock_orig_alert as typeof window.alert;
          window.confirm = w.__copyunlock_orig_confirm as typeof window.confirm;
          window.prompt = w.__copyunlock_orig_prompt as typeof window.prompt;
        }

        // Restore DataTransfer.prototype.setData
        if (w.__copyunlock_orig_setData) {
          DataTransfer.prototype.setData = w.__copyunlock_orig_setData as typeof DataTransfer.prototype.setData;
        }

        // Restore eval, setInterval, setTimeout
        if (w.__copyunlock_orig_eval) {
          (window as Record<string, unknown>).eval = w.__copyunlock_orig_eval;
        }
        if (w.__copyunlock_orig_setInterval) {
          (window as Record<string, unknown>).setInterval = w.__copyunlock_orig_setInterval;
        }
        if (w.__copyunlock_orig_setTimeout) {
          (window as Record<string, unknown>).setTimeout = w.__copyunlock_orig_setTimeout;
        }

        // Re-register blocked listeners that were captured during prototype-intercept
        const blocked = (window as Record<string, unknown>).__copyunlock_blocked_listeners as Array<{
          target: EventTarget; type: string; fn: EventListenerOrEventListenerObject; opts: unknown;
        }> | undefined;
        if (blocked && blocked.length > 0) {
          for (const entry of blocked) {
            try {
              origAddEventListener.call(entry.target, entry.type, entry.fn, entry.opts as boolean | AddEventListenerOptions);
            } catch { /* target may have been garbage collected */ }
          }
          blocked.length = 0;
        }
        break;
      }
    } } catch { /* silently handle errors to never break page functionality */ }
  });
})();
