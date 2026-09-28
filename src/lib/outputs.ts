import { browser } from "wxt/browser";

import { unrestrictLink } from "./rd/api";
import type { Unrestricted } from "./rd/types";
import type { Aria2Config, Player } from "./storage";

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

export async function sendToAria2(urls: string[], config: Aria2Config): Promise<void> {
  const token = config.secret ? [`token:${config.secret}`] : [];
  const options = config.dir ? { dir: config.dir } : {};
  const calls = urls.map((url) => ({ methodName: "aria2.addUri", params: [...token, [url], options] }));
  const res = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "rd", method: "system.multicall", params: [calls] }),
  });
  if (!res.ok) throw new Error(`aria2 answered ${res.status}`);
  const body: { error?: { message: string }; result?: ({ code: number; message: string } | string[])[] } =
    await res.json();
  if (body.error) throw new Error(`aria2: ${body.error.message}`);
  const failure = body.result?.find((entry) => !Array.isArray(entry));
  if (failure && !Array.isArray(failure)) throw new Error(`aria2: ${failure.message}`);
}

export async function testAria2(config: Aria2Config): Promise<string> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "rd",
      method: "aria2.getVersion",
      params: config.secret ? [`token:${config.secret}`] : [],
    }),
  });
  const body: { error?: { message: string }; result?: { version: string } } = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result?.version ?? "unknown";
}

export async function requestAria2Access(config: Aria2Config): Promise<boolean> {
  const origin = `${new URL(config.url).origin}/*`;
  return browser.permissions.request({ origins: [origin] });
}

export function externalPlayerUrl(player: Exclude<Player, "browser">, url: string): string {
  const encoded = encodeURIComponent(url);
  if (player === "iina") return `iina://weblink?url=${encoded}`;
  if (player === "infuse") return `infuse://x-callback-url/play?url=${encoded}`;
  return `vlc://${url}`;
}
