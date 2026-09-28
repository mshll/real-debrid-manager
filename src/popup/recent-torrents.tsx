import { useQueryClient } from "@tanstack/react-query";
import { Copy, Download, ListChecks, MoreHorizontal, Play, RotateCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { FileIcon } from "@/components/file-icon";
import { TorrentMeta, TorrentProgress } from "@/components/torrent-meta";
import { IconButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { useActions } from "@/hooks/use-actions";
import { managerUrl } from "@/lib/pages";
import { useReinsert } from "@/hooks/use-torrent-mutations";
import { isFailed } from "@/lib/format";
import { keys, useRecentTorrents } from "@/lib/queries";
import { deleteTorrent } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";

export function RecentTorrents({ onChooseFiles }: { onChooseFiles: (id: string) => void }): ReactNode {
  const { data: torrents, isLoading } = useRecentTorrents(12);

  if (isLoading) return <div className="h-40" />;
  if (!torrents?.length) {
    return (
      <p className="px-2 py-10 text-center text-[12.5px] text-fg-3">
        Nothing here yet. Paste a magnet above to get started.
      </p>
    );
  }
  return (
    <div className="-mx-1.5">
      {torrents.map((torrent) => (
        <TorrentRow key={torrent.id} torrent={torrent} onChooseFiles={onChooseFiles} />
      ))}
    </div>
  );
}

function TorrentRow({ torrent, onChooseFiles }: { torrent: Torrent; onChooseFiles: (id: string) => void }): ReactNode {
  const actions = useActions();
  const reinsert = useReinsert();
  const queryClient = useQueryClient();
  const ready = torrent.status === "downloaded" && torrent.links.length > 0;

  const open = (): void => {
    browser.tabs.create({ url: managerUrl(`/torrents/${torrent.id}`) }).catch(console.error);
    window.close();
  };

  const remove = async (): Promise<void> => {
    try {
      await deleteTorrent(torrent.id);
      await queryClient.invalidateQueries({ queryKey: keys.torrents });
      toast.success("Deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="group flex items-center gap-2.5 rounded-[10px] px-1.5 py-2 hover:bg-fill" onDoubleClick={open}>
      <FileIcon name={torrent.filename} />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={open}>
        <div className="truncate text-[13px] leading-tight" title={torrent.filename}>
          {torrent.filename || "Fetching info"}
        </div>
        <TorrentMeta torrent={torrent} className="mt-0.5" />
        <TorrentProgress torrent={torrent} className="mt-1.5" />
      </button>
      <div className="flex shrink-0 items-center">
        {torrent.status === "waiting_files_selection" && (
          <IconButton label="Choose files" className="text-warning" onClick={() => onChooseFiles(torrent.id)}>
            <ListChecks />
          </IconButton>
        )}
        {ready && (
          <IconButton label="Download" onClick={() => actions.download(torrent.links)}>
            <Download />
          </IconButton>
        )}
        <Menu
          trigger={
            <IconButton label="More" className="opacity-0 group-hover:opacity-100 data-popup-open:opacity-100">
              <MoreHorizontal />
            </IconButton>
          }
          items={[
            ...(ready
              ? [
                  {
                    label: "Stream",
                    icon: <Play />,
                    onSelect: () => torrent.links[0] && actions.stream(torrent.links[0]),
                  },
                  { label: "Copy links", icon: <Copy />, onSelect: () => actions.copy(torrent.links) },
                ]
              : []),
            ...(isFailed(torrent.status) || ready
              ? [{ label: "Reinsert", icon: <RotateCw />, onSelect: () => reinsert(torrent) }]
              : []),
            "separator" as const,
            { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => remove().catch(console.error) },
          ]}
        />
      </div>
    </div>
  );
}
