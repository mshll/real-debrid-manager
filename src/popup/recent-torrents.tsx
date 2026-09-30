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
import clsx from "clsx";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { StatusIcon } from "@/components/status-icon";
import { isTransferring, TONE_TEXT } from "@/components/torrent-meta";
import { IconButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/progress";
import { useActions } from "@/hooks/use-actions";
import { useReinsert } from "@/hooks/use-torrent-mutations";
import { formatBytes, formatSpeed, isFailed, STATUS } from "@/lib/format";
import { managerUrl } from "@/lib/pages";
import { keys, useRecentTorrents } from "@/lib/queries";
import { deleteTorrent } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";

export function RecentTorrents({ onChooseFiles }: { onChooseFiles: (id: string) => void }): ReactNode {
  const { data: torrents, isLoading } = useRecentTorrents(12);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {[70, 55, 80, 60].map((width) => (
          <div key={width} className="flex h-9 items-center gap-3 px-2">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton style={{ width: `${width}%` }} />
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
    <div className="group flex h-9 items-center gap-3 rounded-[8px] px-2 transition-colors duration-150 hover:bg-fill">
      <StatusIcon status={torrent.status} progress={torrent.progress} />
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left"
        title={torrent.filename}
        onClick={open}
      >
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {torrent.filename || <span className="text-fg-3">Fetching info</span>}
        </span>
        <Meta torrent={torrent} />
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {torrent.status === "waiting_files_selection" && (
          <IconButton
            size="sm"
            label="Choose files"
            className="text-warning!"
            onClick={() => onChooseFiles(torrent.id)}
          >
            <ListChecksIcon />
          </IconButton>
        )}
        {ready && (
          <IconButton size="sm" label="Download" onClick={() => actions.torrents([torrent], "download")}>
            <DownloadSimpleIcon />
          </IconButton>
        )}
        <Menu
          trigger={
            <IconButton
              size="sm"
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

function Meta({ torrent }: { torrent: Torrent }): ReactNode {
  if (isTransferring(torrent)) {
    return (
      <span className="tabular shrink-0 text-[12px] text-info">
        {Math.round(torrent.progress)}%
        {torrent.speed ? <span className="text-fg-3"> · {formatSpeed(torrent.speed)}</span> : null}
      </span>
    );
  }
  const status = STATUS[torrent.status];
  if (torrent.status === "downloaded") {
    return torrent.bytes ? (
      <span className="tabular shrink-0 text-[12px] text-fg-3">{formatBytes(torrent.bytes)}</span>
    ) : null;
  }
  if (torrent.status === "waiting_files_selection" || !torrent.filename) return null;
  return <span className={clsx("shrink-0 text-[12px]", TONE_TEXT[status.tone])}>{status.label}</span>;
}
