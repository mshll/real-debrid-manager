import { browser } from "wxt/browser";

const SCRIPT_ID = "magnet-intercept";

/** Must be called from a user gesture: it may prompt for all-sites access. */
export async function enableIntercept(): Promise<boolean> {
  const granted = await browser.permissions.request({ origins: ["<all_urls>"] });
  if (!granted) return false;
  await registerIntercept();
  return true;
}

export async function registerIntercept(): Promise<void> {
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) return;
  await browser.scripting.registerContentScripts([
    {
      id: SCRIPT_ID,
      js: ["intercept.js"],
      matches: ["<all_urls>"],
      runAt: "document_start",
      allFrames: true,
      persistAcrossSessions: true,
    },
  ]);
}

export async function disableIntercept(): Promise<void> {
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
}
