import { browser } from "wxt/browser";

import { getHostMatchers } from "./hosts";
import { classify, dedupeLinks, extractLinks, type ParsedLink } from "./links";

const MAX_TEXT = 400_000;

/** Needs activeTab, which the popup opening grants. Restricted pages resolve to null. */
export async function scanActiveTab(): Promise<{ tabId: number; links: ParsedLink[] } | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !/^https?:/.test(tab.url ?? "https:")) return null;
  let frames;
  try {
    frames = await browser.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (maxText: number) => ({
        hrefs: Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"), (anchor) => anchor.href),
        text: (document.body?.innerText ?? "").slice(0, maxText),
      }),
      args: [MAX_TEXT],
    });
  } catch (error) {
    console.info("Page scan unavailable", error);
    return null;
  }
  const matchers = await getHostMatchers();
  const found: (ParsedLink | null)[] = [];
  for (const frame of frames) {
    const result = frame.result;
    if (!result) continue;
    found.push(...result.hrefs.map((href) => classify(href, matchers)));
    found.push(...extractLinks(result.text, matchers));
  }
  return { tabId: tab.id, links: dedupeLinks(found) };
}
