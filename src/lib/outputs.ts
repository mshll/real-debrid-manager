import { browser } from "wxt/browser";

import { unrestrictLink } from "./rd/api";
import type { Unrestricted } from "./rd/types";
import type { Player } from "./storage";

export const canDownload = (): boolean => Boolean(browser.downloads);

export async function downloadInBrowser(urls: string[]): Promise<void> {
  for (const url of urls) {
    if (browser.downloads) await browser.downloads.download({ url });
    else await browser.tabs.create({ url, active: false });
  }
}

/** Torrent links are RD share links; each needs unrestricting for a direct URL. */
export async function resolveLinks(links: string[]): Promise<Unrestricted[]> {
  const resolved: Unrestricted[] = [];
  for (const link of links) resolved.push(await unrestrictLink(link));
  return resolved;
}

export function externalPlayerUrl(player: Exclude<Player, "browser">, url: string): string {
  const encoded = encodeURIComponent(url);
  if (player === "iina") return `iina://weblink?url=${encoded}`;
  if (player === "infuse") return `infuse://x-callback-url/play?url=${encoded}`;
  return `vlc://${url}`;
}
