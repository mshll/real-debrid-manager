import { toast } from "sonner";
import { browser } from "wxt/browser";

import { managerUrl } from "@/lib/pages";
import { downloadInBrowser, externalPlayerUrl, sendToAria2 } from "@/lib/outputs";
import { unrestrictLink } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Unrestricted } from "@/lib/rd/types";
import type { PrimaryAction } from "@/lib/storage";

import { useSettings } from "./use-settings";

const SHARE_LINK = /^https:\/\/real-debrid\.com\/d\//i;

/** Share links (torrent.links) need unrestricting; direct links pass through. */
async function toDirect(urls: string[]): Promise<string[]> {
  const direct: string[] = [];
  for (const url of urls) direct.push(SHARE_LINK.test(url) ? (await unrestrictLink(url)).download : url);
  return direct;
}

export interface Actions {
  download: (urls: string[]) => void;
  copy: (urls: string[]) => void;
  aria2: (urls: string[]) => void;
  stream: (url: string, downloadId?: string) => void;
  primary: (urls: string[]) => void;
  run: (action: PrimaryAction, urls: string[]) => void;
}

export function useActions(): Actions {
  const [settings] = useSettings();

  const perform = (label: string, task: () => Promise<string | void>): void => {
    const id = toast.loading(label);
    task()
      .then((message) => {
        if (message) toast.success(message, { id });
        else toast.dismiss(id);
      })
      .catch((error: unknown) => toast.error(errorMessage(error), { id }));
  };

  const download = (urls: string[]): void =>
    perform("Preparing download", async () => {
      await downloadInBrowser(await toDirect(urls));
      return urls.length > 1 ? `Downloading ${urls.length} files` : "Download started";
    });

  const copy = (urls: string[]): void =>
    perform("Copying", async () => {
      await navigator.clipboard.writeText((await toDirect(urls)).join("\n"));
      return urls.length > 1 ? `Copied ${urls.length} links` : "Link copied";
    });

  const aria2 = (urls: string[]): void =>
    perform("Sending to aria2", async () => {
      await sendToAria2(await toDirect(urls), settings.aria2);
      return urls.length > 1 ? `Sent ${urls.length} files to aria2` : "Sent to aria2";
    });

  const stream = (url: string, downloadId?: string): void =>
    perform("Opening", async () => {
      let id = downloadId;
      let direct = url;
      if (!id || SHARE_LINK.test(url)) {
        const unrestricted: Unrestricted = await unrestrictLink(url);
        id = unrestricted.id;
        direct = unrestricted.download;
      }
      if (settings.player === "browser") await browser.tabs.create({ url: managerUrl(`/watch/${id}`) });
      else await browser.tabs.create({ url: externalPlayerUrl(settings.player, direct) });
    });

  const run = (action: PrimaryAction, urls: string[]): void => {
    const [first] = urls;
    if (action === "stream" && first) stream(first);
    else if (action === "copy") copy(urls);
    else if (action === "aria2") aria2(urls);
    else download(urls);
  };

  return { download, copy, aria2, stream, run, primary: (urls) => run(settings.primaryAction, urls) };
}
