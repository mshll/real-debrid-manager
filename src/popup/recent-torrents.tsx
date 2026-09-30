import {
  ArrowClockwiseIcon,
  CopyIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  ListChecksIcon,
  MagnetStraightIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { StatusIcon } from "@/components/status-icon";
import { isTransferring, TorrentMeta } from "@/components/torrent-meta";
import { IconButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Progress, Skeleton } from "@/components/ui/progress";
import { useActions } from "@/hooks/use-actions";
import { useReinsert } from "@/hooks/use-torrent-mutations";
import { isFailed } from "@/lib/format";
import { managerUrl } from "@/lib/pages";
import { keys, useRecentTorrents } from "@/lib/queries";
import { deleteTorrent } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";

export function RecentTorrents({ onChooseFiles }: { onChooseFiles: (id: string) => void }): ReactNode {
  const { data: torrents, isLoading } = useRecentTorrents(12);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-2 py-3">
        {[70, 55, 80, 60].map((width) => (
          <div key={width} className="flex items-center gap-3">
            <Skeleton className="size-3.5 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton style={{ width: `${width}%` }} />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!torrents?.length) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <MagnetStraightIcon className="size-5 text-fg-4" />
        <p className="mt-2 text-[13px] font-medium">No torrents yet</p>
        <p className="mt-0.5 text-[12px] text-fg-3">Paste a magnet above, or right-click any link on the web.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
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
  const ready = torrent.status === "downloaded";

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
    <div className="group flex items-center gap-3 rounded-[8px] px-2 py-2 transition-colors duration-150 hover:bg-fill">
      <StatusIcon status={torrent.status} progress={torrent.progress} />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={open}>
        <div className="truncate text-[13px] leading-tight font-medium" title={torrent.filename}>
          {torrent.filename || "Fetching info"}
        </div>
        <TorrentMeta torrent={torrent} className="mt-1" />
        {isTransferring(torrent) && <Progress value={torrent.progress} tone="info" className="mt-1.5" />}
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {torrent.status === "waiting_files_selection" && (
          <IconButton label="Choose files" className="text-warning!" onClick={() => onChooseFiles(torrent.id)}>
            <ListChecksIcon />
          </IconButton>
        )}
        {ready && (
          <IconButton label="Download" onClick={() => actions.torrents([torrent], "download")}>
            <DownloadSimpleIcon />
          </IconButton>
        )}
        <Menu
          trigger={
            <IconButton
              label="More"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
            >
              <DotsThreeIcon />
            </IconButton>
          }
          items={[
            ...(ready
              ? [
                  {
                    label: "Stream",
                    icon: <PlayIcon />,
                    onSelect: () => actions.torrents([torrent], "stream"),
                  },
                  { label: "Copy links", icon: <CopyIcon />, onSelect: () => actions.torrents([torrent], "copy") },
                ]
              : []),
            ...(isFailed(torrent.status) || ready
              ? [{ label: "Reinsert", icon: <ArrowClockwiseIcon />, onSelect: () => reinsert(torrent) }]
              : []),
            "separator" as const,
            { label: "Delete", icon: <TrashIcon />, danger: true, onSelect: () => remove().catch(console.error) },
          ]}
        />
      </div>
    </div>
  );
}
