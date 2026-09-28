import clsx from "clsx";
import { Download, ListChecks, MoreHorizontal } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { FileIcon } from "@/components/file-icon";
import { TorrentMeta, TorrentProgress } from "@/components/torrent-meta";
import { IconButton } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Menu, type MenuAction } from "@/components/ui/menu";
import { formatBytes } from "@/lib/format";
import type { Torrent } from "@/lib/rd/types";

export const ROW_HEIGHT = 54;

export function TorrentRow({
  torrent,
  selected,
  selecting,
  current,
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
  menu: (MenuAction | "separator")[];
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
        "group mx-2 flex items-center gap-3 rounded-[9px] px-3 transition-colors",
        selected ? "bg-accent-soft" : current ? "bg-fill-strong" : "hover:bg-fill",
      )}
      style={{ height: ROW_HEIGHT - 2 }}
    >
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
          "-m-1.5 flex p-1.5 transition-opacity",
          selecting || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <CheckMark checked={selected} />
      </button>
      <FileIcon name={torrent.filename} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] leading-tight" title={torrent.filename}>
          {torrent.filename || "Fetching info"}
        </div>
        <TorrentMeta torrent={torrent} showSize={false} className="mt-0.5" />
        <TorrentProgress torrent={torrent} className="mt-1 max-w-sm" />
      </div>
      <span className="tabular hidden w-20 text-right text-[12px] text-fg-2 lg:block">
        {torrent.bytes ? formatBytes(torrent.bytes) : "—"}
      </span>
      <div className="flex w-16 shrink-0 justify-end" onClick={(event) => event.stopPropagation()}>
        {torrent.status === "waiting_files_selection" && (
          <IconButton label="Choose files" className="text-warning" onClick={onChooseFiles}>
            <ListChecks />
          </IconButton>
        )}
        {ready && (
          <IconButton label="Download" className="opacity-0 group-hover:opacity-100" onClick={onDownload}>
            <Download />
          </IconButton>
        )}
        <Menu
          trigger={
            <IconButton label="More" className="opacity-0 group-hover:opacity-100 data-popup-open:opacity-100">
              <MoreHorizontal />
            </IconButton>
          }
          items={menu}
        />
      </div>
    </div>
  );
}
