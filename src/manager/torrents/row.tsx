import {
  ArrowClockwiseIcon,
  CopyIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  ListChecksIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type { MouseEvent, ReactNode } from "react";

import { StatusIcon } from "@/components/status-icon";
import { isTransferring, TONE_TEXT } from "@/components/torrent-meta";
import { Button, IconButton } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatRelative, formatSpeed, isFailed, STATUS } from "@/lib/format";
import type { Torrent } from "@/lib/rd/types";
import { isVideo } from "@/lib/select";

export const ROW_HEIGHT = 56;

/** Shared by the header and rows so the columns line up. */
export const COLUMNS = {
  check: "w-5 shrink-0",
  size: "hidden w-20 shrink-0 text-right @lg:block",
  actions: "flex w-32 shrink-0 items-center justify-end gap-0.5",
};

export interface RowActions {
  open: () => void;
  toggle: (event: MouseEvent) => void;
  download: () => void;
  copy: () => void;
  stream: () => void;
  reinsert: () => void;
  chooseFiles: () => void;
}

export function TorrentRow({
  torrent,
  selected,
  selecting,
  current,
  cursor,
  menu,
  actions,
}: {
  torrent: Torrent;
  selected: boolean;
  selecting: boolean;
  current: boolean;
  cursor: boolean;
  menu: MenuEntry[];
  actions: RowActions;
}): ReactNode {
  const ready = torrent.status === "downloaded";
  const streamable = ready && torrent.links.length <= 1 && isVideo(torrent.filename);
  return (
    <div
      role="row"
      aria-selected={selected}
      onClick={(event) => (event.metaKey || event.shiftKey || selecting ? actions.toggle(event) : actions.open())}
      className={clsx(
        "group gutter relative flex items-center gap-3 border-b border-border transition-colors duration-100",
        selected ? "bg-accent-soft" : current ? "bg-fill-strong" : "hover:bg-fill",
        cursor && !current && !selected && "bg-fill",
      )}
      style={{ height: ROW_HEIGHT }}
    >
      {cursor && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
      <span className={COLUMNS.check}>
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label="Select"
          onClick={(event) => {
            event.stopPropagation();
            actions.toggle(event);
          }}
          className={clsx(
            "-m-1.5 flex p-1.5 transition-opacity duration-100",
            selecting || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <CheckMark checked={selected} />
        </button>
      </span>
      <StatusIcon status={torrent.status} progress={torrent.progress} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] leading-snug font-medium" title={torrent.filename}>
          {torrent.filename || <span className="text-fg-3">Fetching info</span>}
        </div>
        <Meta torrent={torrent} />
      </div>
      <span className={clsx(COLUMNS.size, "tabular text-[13px] text-fg-2")}>
        {torrent.bytes ? formatBytes(torrent.bytes) : <span className="text-fg-4">—</span>}
      </span>
      <span className={COLUMNS.actions} onClick={(event) => event.stopPropagation()}>
        {torrent.status === "waiting_files_selection" && (
          <Button
            size="sm"
            icon={<ListChecksIcon />}
            className="bg-warning-soft text-warning shadow-none hover:bg-warning-soft hover:brightness-110"
            onClick={actions.chooseFiles}
          >
            Choose files
          </Button>
        )}
        {isFailed(torrent.status) && (
          <IconButton label="Reinsert" onClick={actions.reinsert}>
            <ArrowClockwiseIcon />
          </IconButton>
        )}
        {streamable && (
          <IconButton label="Stream" onClick={actions.stream}>
            <PlayIcon />
          </IconButton>
        )}
        {ready && (
          <>
            <IconButton label="Copy links" onClick={actions.copy}>
              <CopyIcon />
            </IconButton>
            <IconButton label="Download" onClick={actions.download}>
              <DownloadSimpleIcon />
            </IconButton>
          </>
        )}
        <Menu
          trigger={
            <IconButton label="More">
              <DotsThreeIcon />
            </IconButton>
          }
          items={menu}
        />
      </span>
    </div>
  );
}

function Meta({ torrent }: { torrent: Torrent }): ReactNode {
  const status = STATUS[torrent.status];
  const added = formatRelative(torrent.added);
  const size = torrent.bytes ? (
    <span className="@lg:hidden">
      {formatBytes(torrent.bytes)}
      <Dot />
    </span>
  ) : null;

  if (isTransferring(torrent)) {
    const rate = torrent.status !== "downloading" ? status.label : torrent.speed ? formatSpeed(torrent.speed) : null;
    return (
      <div className="tabular mt-1 flex items-center gap-2 text-[12px] text-fg-3">
        <Progress value={torrent.progress} tone="info" className="w-20 shrink-0" />
        <span className="shrink-0 font-medium text-fg-2">{Math.round(torrent.progress)}%</span>
        <span className="truncate">
          {rate}
          {rate && torrent.seeders !== undefined && <Dot />}
          {torrent.seeders !== undefined && `${torrent.seeders} seeders`}
        </span>
      </div>
    );
  }
  return (
    <div className="tabular mt-0.5 truncate text-[12px] text-fg-3">
      {torrent.status !== "downloaded" && (
        <>
          <span className={clsx("font-medium", TONE_TEXT[status.tone])}>
            {torrent.status === "waiting_files_selection" ? "Waiting for file selection" : status.label}
          </span>
          <Dot />
        </>
      )}
      {size}
      {added}
    </div>
  );
}

function Dot(): ReactNode {
  return <span className="mx-1.5 text-fg-4">·</span>;
}
