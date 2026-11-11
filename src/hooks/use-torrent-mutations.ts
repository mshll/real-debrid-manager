import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { sendMessage } from "@/lib/messaging";
import { keys } from "@/lib/queries";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";

/** Runs in the worker so closing the popup mid-poll can't leave a duplicate torrent behind. */
export function reinsertTorrent(torrent: Torrent): Promise<string> {
  return sendMessage("reinsert", { id: torrent.id, hash: torrent.hash });
}

export function useReinsert(): (torrent: Torrent, onReinserted?: (id: string) => void) => void {
  const queryClient = useQueryClient();
  return (torrent, onReinserted) => {
    const id = toast.loading("Reinserting");
    reinsertTorrent(torrent)
      .then((next) => {
        toast.success("Reinserted with the same files", { id });
        onReinserted?.(next);
        return queryClient.invalidateQueries({ queryKey: keys.torrents });
      })
      .catch((error: unknown) => toast.error(errorMessage(error), { id }));
  };
}
