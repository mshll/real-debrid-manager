import { browser } from "wxt/browser";

import type { LinkKind, ParsedLink } from "./links";
import {
  addMagnet,
  addTorrentFile,
  deleteTorrent,
  getTorrent,
  listTorrents,
  selectFiles,
  unrestrictContainerLink,
  unrestrictFolder,
  unrestrictLink,
} from "./rd/api";
import { errorMessage } from "./rd/errors";
import type { Torrent, Unrestricted } from "./rd/types";
import { chooseFiles } from "./select";
import { getSettings, touchLibrary, updatePending, type FileSelection } from "./storage";

export type AddStatus = "started" | "choose-files" | "waiting-metadata" | "duplicate" | "not-cached" | "unrestricted";

export type AddOutcome =
  | { ok: true; kind: LinkKind; title: string; status: AddStatus; torrentId?: string; downloads?: Unrestricted[] }
  | { ok: false; kind: LinkKind; title: string; error: string };

export interface AddOptions {
  rule?: FileSelection;
  /** Tab to fetch .torrent files from, so the site's cookies apply. */
  tabId?: number;
}

const METADATA_WAIT_MS = 15_000;
const ACTIVE_STATUSES = new Set([
  "magnet_conversion",
  "waiting_files_selection",
  "queued",
  "downloading",
  "downloaded",
  "compressing",
  "uploading",
]);

/** Runs sequentially: RD rate-limits parallel adds. */
export async function addLinks(links: ParsedLink[], options: AddOptions = {}): Promise<AddOutcome[]> {
  const settings = await getSettings();
  const rule = options.rule ?? settings.fileSelection;
  let library: Torrent[] | null = null;
  const outcomes: AddOutcome[] = [];

  for (const link of links) {
    const title = link.name ?? link.url;
    try {
      if (link.kind === "magnet" || link.kind === "torrent") {
        if (settings.skipDuplicates && link.hash) {
          library ??= (await listTorrents()).items;
          const existing = library.find((t) => t.hash.toLowerCase() === link.hash && ACTIVE_STATUSES.has(t.status));
          if (existing) {
            outcomes.push({
              ok: true,
              kind: link.kind,
              title: existing.filename,
              status: "duplicate",
              torrentId: existing.id,
            });
            continue;
          }
        }
        const added =
          link.kind === "magnet"
            ? await addMagnet(link.url)
            : await addTorrentFile(await fetchTorrentFile(link.url, options.tabId));
        const started = await startTorrent(added.id, rule, settings.onlyCached);
        outcomes.push({
          ok: true,
          kind: link.kind,
          title: started.title ?? title,
          status: started.status,
          torrentId: added.id,
        });
      } else {
        const targets =
          link.kind === "folder"
            ? await unrestrictFolder(link.url)
            : link.kind === "container"
              ? await unrestrictContainerLink(link.url)
              : [link.url];
        const downloads: Unrestricted[] = [];
        for (const target of targets) downloads.push(await unrestrictLink(target));
        const first = downloads[0];
        outcomes.push({
          ok: true,
          kind: link.kind,
          title: downloads.length === 1 && first ? first.filename : `${downloads.length} files`,
          status: "unrestricted",
          downloads,
        });
      }
    } catch (error) {
      outcomes.push({ ok: false, kind: link.kind, title, error: errorMessage(error) });
    }
  }

  await touchLibrary();
  return outcomes;
}

/** For .torrent files uploaded directly from a UI page. */
export async function startUploadedTorrent(id: string, name: string): Promise<AddOutcome> {
  const settings = await getSettings();
  try {
    const started = await startTorrent(id, settings.fileSelection, settings.onlyCached);
    await touchLibrary();
    return { ok: true, kind: "torrent", title: started.title ?? name, status: started.status, torrentId: id };
  } catch (error) {
    return { ok: false, kind: "torrent", title: name, error: errorMessage(error) };
  }
}

/**
 * Waits briefly for RD to resolve the magnet, then selects files by rule.
 * Slow magnets are handed to the background sweep so they still start on
 * their own after the caller has gone away.
 */
async function startTorrent(
  id: string,
  rule: FileSelection,
  onlyCached: boolean,
): Promise<{ status: AddStatus; title?: string }> {
  await updatePending((pending) => {
    pending[id] = { rule, onlyCached, addedAt: Date.now(), inFlight: true };
  });
  try {
    const deadline = Date.now() + METADATA_WAIT_MS;
    let info = await getTorrent(id);
    while (info.status === "magnet_conversion" && Date.now() < deadline) {
      await sleep(1000);
      info = await getTorrent(id);
    }
    const title = info.filename || undefined;

    if (info.status === "magnet_conversion") {
      // Cached magnets resolve instantly; one still converting has to find peers first.
      if (onlyCached) {
        await deleteTorrent(id);
        await clearPending(id);
        return { status: "not-cached", title };
      }
      await handOff(id);
      return { status: "waiting-metadata", title };
    }
    if (info.status !== "waiting_files_selection") {
      const status = await verifyCached(id, onlyCached);
      await clearPending(id);
      return { status, title };
    }
    if (rule === "ask") {
      await handOff(id);
      return { status: "choose-files", title };
    }
    const status = await selectAndVerify(id, chooseFiles(info.files, rule), onlyCached);
    await clearPending(id);
    return { status, title };
  } catch (error) {
    await handOff(id);
    throw error;
  }
}

/** Shared by the add flow, the background sweep and the file picker. */
export async function selectAndVerify(
  id: string,
  files: number[] | "all",
  onlyCached: boolean,
): Promise<"started" | "not-cached"> {
  await selectFiles(id, files);
  return verifyCached(id, onlyCached);
}

async function verifyCached(id: string, onlyCached: boolean): Promise<"started" | "not-cached"> {
  if (!onlyCached || (await becameReady(id))) return "started";
  await deleteTorrent(id);
  return "not-cached";
}

/** Cached torrents flip to "downloaded" right after selection. */
async function becameReady(id: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if ((await getTorrent(id)).status === "downloaded") return true;
    await sleep(1000);
  }
  return false;
}

async function handOff(id: string): Promise<void> {
  await updatePending((pending) => {
    const entry = pending[id];
    if (entry) entry.inFlight = false;
  });
}

export async function clearPending(id: string): Promise<void> {
  await updatePending((pending) => {
    delete pending[id];
  });
}

async function fetchTorrentFile(url: string, tabId?: number): Promise<Blob> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) return await res.blob();
  } catch (error) {
    if (tabId === undefined) throw error;
  }
  if (tabId === undefined) throw new Error("Couldn't download the .torrent file");

  const [result] = await browser.scripting.executeScript({
    target: { tabId },
    args: [url],
    func: async (fileUrl: string) => {
      const res = await fetch(fileUrl, { credentials: "include" });
      if (!res.ok) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
  });
  const base64 = result?.result;
  if (typeof base64 !== "string") throw new Error("Couldn't download the .torrent file");
  return new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], { type: "application/x-bittorrent" });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
