import { Clipboard } from '@wailsio/runtime';

/**
 * Copy text to the system clipboard.
 *
 * `navigator.clipboard` is unavailable in the Wails webview — it is gated on a
 * secure context, so it throws "The request is not allowed by the user agent or
 * the platform in the current context". Go through the Wails runtime instead and
 * keep the browser API only as a fallback for e2e/server mode, where the runtime
 * bridge is not present.
 */
export const copyText = async (text: string): Promise<void> => {
  try {
    await Clipboard.SetText(text);
    return;
  } catch {
    // fall through to the browser API
  }
  await navigator.clipboard.writeText(text);
};
