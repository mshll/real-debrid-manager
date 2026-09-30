import { DotsThreeIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import type { MouseEvent, ReactNode } from "react";

import { StatusIcon } from "@/components/status-icon";
import { isTransferring, TONE_TEXT } from "@/components/torrent-meta";
import { Button, IconButton } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatRelative, formatSpeed, STATUS } from "@/lib/format";
import type { Torrent } from "@/lib/rd/types";

export const ROW_HEIGHT = 44;

/** Shared by the header and rows so the columns line up. */
export const COLUMNS = {
  check: "w-5 shrink-0",
  status: "hidden w-52 shrink-0 @2xl:block",
  size: "hidden w-20 shrink-0 text-right @xl:block",
  added: "hidden w-28 shrink-0 text-right @4xl:block",
  actions: "flex w-16 shrink-0 justify-end",
};

export function TorrentRow({
  torrent,
  selected,
  selecting,
  current,
  cursor,
  menu,
  onToggle,
  onOpen,
  onDownload,
  onChooseFiles,
}: {
  torrent: Torrent;
  selected: boolean;
  selecting: boolean;
  current: boolean;
  cursor: boolean;
  menu: MenuEntry[];
  onToggle: (event: MouseEvent) => void;
  onOpen: () => void;
  onDownload: () => void;
  onChooseFiles: () => void;
}): ReactNode {
  const ready = torrent.status === "downloaded" && torrent.links.length > 0;
  return (
    <div
      role="row"
      aria-selected={selected}
      onClick={(event) => (event.metaKey || event.shiftKey || selecting ? onToggle(event) : onOpen())}
      className={clsx(
        "group relative flex items-center gap-3 border-b border-border px-5 transition-colors duration-100",
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
            onToggle(event);
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
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={torrent.filename}>
        {torrent.filename || <span className="text-fg-3">Fetching info</span>}
      </span>
      <span className={COLUMNS.status}>
        <StatusCell torrent={torrent} onChooseFiles={onChooseFiles} />
      </span>
      <span className={clsx(COLUMNS.size, "tabular text-[13px] text-fg-2")}>
        {torrent.bytes ? formatBytes(torrent.bytes) : <span className="text-fg-4">—</span>}
      </span>
      <span className={clsx(COLUMNS.added, "tabular truncate text-[13px] text-fg-3")}>
        {formatRelative(torrent.added)}
      </span>
      <span className={COLUMNS.actions} onClick={(event) => event.stopPropagation()}>
        {ready && (
          <IconButton
            label="Download"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            onClick={onDownload}
          >
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
          items={menu}
        />
      </span>
    </div>
  );
}

function StatusCell({ torrent, onChooseFiles }: { torrent: Torrent; onChooseFiles: () => void }): ReactNode {
  const status = STATUS[torrent.status];
  if (torrent.status === "waiting_files_selection") {
    return (
      <Button
        size="sm"
        className="h-6 bg-warning-soft px-2 text-[12px] text-warning shadow-none hover:bg-warning-soft hover:brightness-110"
        onClick={(event) => {
          event.stopPropagation();
          onChooseFiles();
        }}
      >
        Choose files
      </Button>
    );
  }
  if (isTransferring(torrent)) {
    return (
      <span className="tabular flex items-center gap-2.5 text-[12px] text-fg-2">
        <Progress value={torrent.progress} tone="info" className="w-16 shrink-0" />
        <span className="w-8 shrink-0 font-medium text-fg">{Math.round(torrent.progress)}%</span>
        <span className="truncate text-fg-3">
          {torrent.status !== "downloading"
            ? status.label
            : torrent.speed
              ? formatSpeed(torrent.speed)
              : torrent.seeders !== undefined
                ? `${torrent.seeders} seeders`
                : ""}
        </span>
      </span>
    );
  }
  return (
    <span className={clsx("text-[13px]", status.tone === "accent" ? "text-fg-2" : TONE_TEXT[status.tone])}>
      {status.label}
    </span>
  );
}
