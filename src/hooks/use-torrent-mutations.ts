import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { keys } from "@/lib/queries";
import { addMagnet, deleteTorrent, getTorrent, selectFiles } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";
import { isFailed } from "@/lib/format";
import { hashToMagnet } from "@/lib/links";

/**
 * Re-adds a torrent with the same file selection and removes the old one.
 * The fix for links that aged out ("hoster unavailable") and for dead torrents.
 */
const REINSERT_WAIT_S = 30;

export async function reinsertTorrent(torrent: Torrent): Promise<string> {
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

export function useReinsert(): (torrent: Torrent) => void {
  const queryClient = useQueryClient();
  return (torrent) => {
    const id = toast.loading("Reinserting");
    reinsertTorrent(torrent)
      .then(() => {
        toast.success("Reinserted with the same files", { id });
        return queryClient.invalidateQueries({ queryKey: keys.torrents });
      })
      .catch((error: unknown) => toast.error(errorMessage(error), { id }));
  };
}
