import { browser } from "wxt/browser";

import { getHostMatchers } from "./hosts";
import { classify, dedupeLinks, extractLinks, type ParsedLink } from "./links";

const MAX_TEXT = 400_000;

export type PageScan =
  | { status: "ok"; tabId: number; url: string; links: ParsedLink[] }
  /** Browser pages, the web store and similar, which no extension can read. */
  | { status: "restricted" }
  /** Readable once the user grants this site; the side panel has no activeTab grant. */
  | { status: "no-access"; origin: string; host: string };

/** The popup gets activeTab when it opens; the side panel needs a host permission instead. */
export async function scanActiveTab(): Promise<PageScan> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !/^https?:/.test(tab.url ?? "https:")) return { status: "restricted" };
  const url = tab.url ?? "";
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
    const parsed = URL.parse(url);
    if (parsed) {
      const origin = `${parsed.protocol}//${parsed.hostname}/*`;
      if (!(await browser.permissions.contains({ origins: [origin] }))) {
        return { status: "no-access", origin, host: parsed.hostname.replace(/^www\./, "") };
      }
    }
    console.info("Page scan unavailable", error);
    return { status: "restricted" };
  }
  const matchers = await getHostMatchers();
  const found: (ParsedLink | null)[] = [];
  for (const frame of frames) {
    const result = frame.result;
    if (!result) continue;
    found.push(...result.hrefs.map((href) => classify(href, matchers)));
    found.push(...extractLinks(result.text, matchers));
  }
  return { status: "ok", tabId: tab.id, url, links: dedupeLinks(found) };
}
