import { browser } from "wxt/browser";

import { selectAndVerify } from "@/lib/add";
import { getTorrent, getUser, listRecentTorrents } from "@/lib/rd/api";
import type { Torrent, TorrentStatus } from "@/lib/rd/types";
import { chooseFiles } from "@/lib/select";
import {
  authItem,
  expiryNotifiedItem,
  getSettings,
  pendingSelectionItem,
  torrentSnapshotItem,
  touchLibrary,
  updatePending,
  type FileSelection,
} from "@/lib/storage";

import { notify } from "./notify";

export const SYNC_ALARM = "sync";
export const DAILY_ALARM = "daily";

const ACTIVE: TorrentStatus[] = [
  "magnet_conversion",
  "waiting_files_selection",
  "queued",
  "downloading",
  "compressing",
  "uploading",
];
const FAILED: TorrentStatus[] = ["magnet_error", "error", "virus", "dead"];
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
/** An add call that hasn't finished by now was likely killed with the worker. */
const IN_FLIGHT_GRACE_MS = 2 * 60 * 1000;

let running: Promise<void> | null = null;
let queued: Promise<void> | null = null;

/**
 * Coalesces overlapping triggers, but a call during a run always gets one
 * more pass so it sees state written after the running pass started.
 */
export function sync(): Promise<void> {
  if (!running) {
    running = runSync().finally(() => {
      running = null;
    });
    return running;
  }
  queued ??= running
    .catch((error: unknown) => console.warn("Previous sync failed", error))
    .then(() => {
      queued = null;
      return sync();
    });
  return queued;
}

async function runSync(): Promise<void> {
  if (!(await authItem.getValue())) {
    await setBadge(0);
    await browser.alarms.clear(SYNC_ALARM);
    return;
  }
  const settings = await getSettings();
  const fetchedAt = Date.now();
  const torrents = await listRecentTorrents(100);
  const changed = await startWaitingTorrents(
    torrents,
    fetchedAt,
    settings.autoStartExternal ? { rule: settings.fileSelection, onlyCached: settings.onlyCached } : null,
  );

  const previous = await torrentSnapshotItem.getValue();
  const firstRun = Object.keys(previous).length === 0;
  const snapshot: Record<string, string> = {};
  for (const torrent of torrents) {
    snapshot[torrent.id] = torrent.status;
    const before = previous[torrent.id];
    if (firstRun || !before || before === torrent.status) continue;
    if (torrent.status === "downloaded" && settings.notifyComplete) {
      await notify(`torrent:${torrent.id}`, "Ready", torrent.filename);
    } else if (FAILED.includes(torrent.status) && settings.notifyErrors) {
      await notify(
        `torrent:${torrent.id}`,
        "Torrent failed",
        `${torrent.filename} (${torrent.status.replace(/_/g, " ")})`,
      );
    }
  }
  const statusChanged = torrents.some((torrent) => previous[torrent.id] !== torrent.status);
  await torrentSnapshotItem.setValue(snapshot);
  if (changed || statusChanged) await touchLibrary();

  const active = torrents.filter((torrent) => ACTIVE.includes(torrent.status)).length;
  await setBadge(settings.showBadge ? active : 0);
  const pending = Object.keys(await pendingSelectionItem.getValue()).length;
  if (active > 0 || pending > 0) await browser.alarms.create(SYNC_ALARM, { periodInMinutes: 0.5 });
  else await browser.alarms.clear(SYNC_ALARM);
}

/**
 * Finishes torrents whose metadata arrived after the add call returned, and
 * optionally ones added outside the extension (Stremio, DMM, the RD site).
 */
async function startWaitingTorrents(
  torrents: Torrent[],
  fetchedAt: number,
  external: { rule: FileSelection; onlyCached: boolean } | null,
): Promise<boolean> {
  const pending = await pendingSelectionItem.getValue();
  const done = new Set<string>();
  let changed = false;

  for (const torrent of torrents) {
    const entry = pending[torrent.id];
    if (torrent.status !== "waiting_files_selection") {
      if (entry && torrent.status !== "magnet_conversion" && !entry.inFlight) done.add(torrent.id);
      continue;
    }
    if (entry?.inFlight && Date.now() - entry.addedAt < IN_FLIGHT_GRACE_MS) continue;
    const plan = entry ?? external;
    if (!plan || plan.rule === "ask") continue;
    try {
      const info = await getTorrent(torrent.id);
      const result = await selectAndVerify(torrent.id, chooseFiles(info.files, plan.rule), plan.onlyCached);
      if (result === "not-cached") await notify(`torrent:${torrent.id}`, "Not cached, removed", torrent.filename);
      done.add(torrent.id);
      changed = true;
    } catch (error) {
      console.warn("Auto-select failed", torrent.id, error);
    }
  }
  for (const [id, entry] of Object.entries(pending)) {
    const expired = Date.now() - entry.addedAt > PENDING_TTL_MS;
    const vanished = entry.addedAt < fetchedAt - IN_FLIGHT_GRACE_MS && !torrents.some((torrent) => torrent.id === id);
    if (expired || vanished) done.add(id);
  }
  if (done.size) {
    await updatePending((latest) => {
      for (const id of done) delete latest[id];
    });
  }
  return changed;
}

export async function setBadge(count: number): Promise<void> {
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  await browser.action.setBadgeBackgroundColor({ color: "#B7D995" });
  await browser.action.setBadgeTextColor?.({ color: "#1B2A10" });
}

export async function checkExpiry(): Promise<void> {
  if (!(await authItem.getValue())) return;
  const settings = await getSettings();
  if (!settings.expiryReminderDays) return;
  const user = await getUser();
  const days = Math.floor(user.premium / 86400);
  if (user.type !== "premium" || days > settings.expiryReminderDays) return;
  const expiresAt = Date.parse(user.expiration);
  if ((await expiryNotifiedItem.getValue()) === expiresAt) return;
  const shown = await notify(
    "expiry",
    "Premium ends soon",
    days <= 0 ? "Your premium ends today" : `Your premium ends in ${days} day${days === 1 ? "" : "s"}`,
  );
  if (shown) await expiryNotifiedItem.setValue(expiresAt);
}
