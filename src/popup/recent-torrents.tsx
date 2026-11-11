import {
  ArrowClockwiseIcon,
  CopyIcon,
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

import { StatusIcon } from "@/components/status-icon";
import { isTransferring, TONE_TEXT } from "@/components/torrent-meta";
import { IconButton } from "@/components/ui/button";
import { useActions } from "@/hooks/use-actions";
import { useReinsert } from "@/hooks/use-torrent-mutations";
import { formatBytes, formatSpeed, isFailed, STATUS } from "@/lib/format";
import { keys, useRecentTorrents } from "@/lib/queries";
import { deleteTorrent } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";
import { isVideo } from "@/lib/select";

import { ListEmpty, ListSkeleton } from "./list-states";
import { PopupRow } from "./row";

export function RecentTorrents({
  onOpen,
  onChooseFiles,
}: {
  onOpen: (route: string) => void;
  onChooseFiles: (id: string) => void;
}): ReactNode {
  const { data: torrents, isLoading } = useRecentTorrents(30);

  if (isLoading) return <ListSkeleton />;
  if (!torrents?.length) {
    return (
      <ListEmpty
        icon={<MagnetStraightIcon />}
        title="No torrents yet"
        description="Paste a magnet above, or right-click any link on the web."
      />
    );
  }
  return (
    <div className="flex flex-col">
      {torrents.map((torrent) => (
        <TorrentRow key={torrent.id} torrent={torrent} onOpen={onOpen} onChooseFiles={onChooseFiles} />
      ))}
    </div>
  );
}

function TorrentRow({
  torrent,
  onOpen,
  onChooseFiles,
}: {
  torrent: Torrent;
  onOpen: (route: string) => void;
  onChooseFiles: (id: string) => void;
}): ReactNode {
  const actions = useActions();
  const reinsert = useReinsert();
  const queryClient = useQueryClient();
  const ready = torrent.status === "downloaded";

  const remove = async (): Promise<void> => {
    try {
      await deleteTorrent(torrent.id);
      await queryClient.invalidateQueries({ queryKey: keys.torrents });
      toast.success("Deleted", { description: torrent.filename });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <PopupRow
      icon={<StatusIcon status={torrent.status} progress={torrent.progress} />}
      title={torrent.filename || "Fetching info"}
      muted={!torrent.filename}
      meta={<Meta torrent={torrent} />}
      onClick={() => onOpen(`/torrents/${torrent.id}`)}
      actions={
        <>
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
          {isFailed(torrent.status) && (
            <IconButton size="sm" label="Reinsert" onClick={() => reinsert(torrent)}>
              <ArrowClockwiseIcon />
            </IconButton>
          )}
          {ready && torrent.links.length <= 1 && isVideo(torrent.filename) && (
            <IconButton size="sm" label="Stream" onClick={() => actions.torrents([torrent], "stream")}>
              <PlayIcon />
            </IconButton>
          )}
          {ready && (
            <>
              <IconButton size="sm" label="Copy links" onClick={() => actions.torrents([torrent], "copy")}>
                <CopyIcon />
              </IconButton>
              <IconButton size="sm" label="Download" onClick={() => actions.torrents([torrent], "download")}>
                <DownloadSimpleIcon />
              </IconButton>
            </>
          )}
          <IconButton
            size="sm"
            label="Delete"
            className="hover:text-danger!"
            onClick={() => remove().catch(console.error)}
          >
            <TrashIcon />
          </IconButton>
        </>
      }
    />
  );
}

function Meta({ torrent }: { torrent: Torrent }): ReactNode {
  if (isTransferring(torrent)) {
    return (
      <span className="text-info">
        {Math.round(torrent.progress)}%
        {torrent.speed ? <span className="text-fg-3"> · {formatSpeed(torrent.speed)}</span> : null}
      </span>
    );
  }
  if (torrent.status === "downloaded") return torrent.bytes ? formatBytes(torrent.bytes) : null;
  if (!torrent.filename) return null;
  const status = STATUS[torrent.status];
  return <span className={clsx(TONE_TEXT[status.tone])}>{status.label}</span>;
}
