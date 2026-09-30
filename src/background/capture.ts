import { browser } from "wxt/browser";

import { addLinks, type AddOutcome } from "@/lib/add";
import { getHostMatchers } from "@/lib/hosts";
import { classify, extractLinks, type ParsedLink } from "@/lib/links";
import { describeOutcomes } from "@/lib/outcome";
import { downloadInBrowser } from "@/lib/outputs";
import { getSettings } from "@/lib/storage";

import { notify, openManager } from "./notify";
import { sync } from "./sync";

export const MENU = {
  link: "rd-link",
  selection: "rd-selection",
  scan: "rd-scan",
  manager: "rd-manager",
} as const;

export async function createMenus(): Promise<void> {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({ id: MENU.link, title: "Send to Real-Debrid", contexts: ["link"] });
  browser.contextMenus.create({ id: MENU.selection, title: "Send selection to Real-Debrid", contexts: ["selection"] });
  browser.contextMenus.create({ id: MENU.scan, title: "Find links on this page", contexts: ["page"] });
  browser.contextMenus.create({ id: MENU.manager, title: "Open Manager", contexts: ["action"] });
}

export async function handleMenuClick(
  info: { menuItemId: string | number; linkUrl?: string; selectionText?: string },
  tabId?: number,
): Promise<void> {
  if (info.menuItemId === MENU.manager) return openManager();
  if (info.menuItemId === MENU.scan) return openPopup();

  const matchers = await getHostMatchers();
  let links: ParsedLink[] = [];
  if (info.menuItemId === MENU.link && info.linkUrl) {
    // The user explicitly chose this link, so try it even if no host pattern matched.
    links = [classify(info.linkUrl, matchers) ?? { kind: "hoster", url: info.linkUrl }];
  } else if (info.menuItemId === MENU.selection && info.selectionText) {
    links = extractLinks(info.selectionText, matchers, { bareHashes: true });
  }
  if (!links.length) {
    await notify("empty", "No links found", "Nothing in the selection looks like a magnet or supported link");
    return;
  }
  await captureAndReport(links, tabId);
}

/** Used by context menu, omnibox and the magnet interceptor, where no UI is open. */
export async function captureAndReport(links: ParsedLink[], tabId?: number): Promise<AddOutcome[]> {
  const outcomes = await addLinks(links, { tabId });
  const summary = describeOutcomes(outcomes);
  const torrentId = outcomes.length === 1 && outcomes[0]?.ok ? outcomes[0].torrentId : undefined;
  await runPrimaryAction(outcomes);
  await sync();
  const shown = await notify(torrentId ? `torrent:${torrentId}` : "added", summary.title, summary.message);
  if (!shown) await flashBadge(summary.ok);
  return outcomes;
}

async function runPrimaryAction(outcomes: AddOutcome[]): Promise<void> {
  const urls = outcomes.flatMap((outcome) => (outcome.ok ? (outcome.downloads ?? []).map((d) => d.download) : []));
  if (!urls.length) return;
  const settings = await getSettings();
  try {
    if (settings.primaryAction === "download") await downloadInBrowser(urls);
  } catch (error) {
    console.warn("Primary action failed", error);
    await notify("added", "Couldn't hand off the download", String(error));
  }
}

async function openPopup(): Promise<void> {
  try {
    await browser.action.openPopup();
  } catch (error) {
    console.warn("openPopup unavailable, opening manager", error);
    await openManager();
  }
}

async function flashBadge(ok: boolean): Promise<void> {
  await browser.action.setBadgeText({ text: ok ? "✓" : "!" });
  setTimeout(() => {
    sync().catch((error: unknown) => console.warn("Badge reset failed", error));
  }, 3000);
}
