import { isFailed } from "./format";
import { hashToMagnet } from "./links";
import { addMagnet, deleteTorrent, getTorrent, selectFiles } from "./rd/api";
import type { Torrent } from "./rd/types";

/**
 * Re-adds a torrent with the same file selection and removes the old one.
 * The fix for links that aged out ("hoster unavailable") and for dead torrents.
 */
const REINSERT_WAIT_S = 30;

export async function reinsertTorrent(torrent: Pick<Torrent, "id" | "hash">): Promise<string> {
  const info = await getTorrent(torrent.id);
  const selected = info.files.filter((file) => file.selected === 1).map((file) => file.id);
  const added = await addMagnet(hashToMagnet(torrent.hash));
  for (let attempt = 0; attempt < REINSERT_WAIT_S; attempt++) {
    const fresh = await getTorrent(added.id);
    if (fresh.status === "waiting_files_selection") {
      await selectFiles(added.id, selected.length ? selected : "all");
      await deleteTorrent(torrent.id);
      return added.id;
    }
    if (fresh.status !== "magnet_conversion") {
      if (isFailed(fresh.status)) break;
      await deleteTorrent(torrent.id);
      return added.id;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  // Keep the original: the new copy never got far enough to replace it.
  await deleteTorrent(added.id);
  throw new Error("Couldn't reinsert, Real-Debrid didn't pick the torrent up");
}
