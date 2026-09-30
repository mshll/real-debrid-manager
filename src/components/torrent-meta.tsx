import clsx from "clsx";
import type { ReactNode } from "react";

import { formatBytes, formatRelative, formatSpeed, STATUS, type Tone } from "@/lib/format";
import type { Torrent } from "@/lib/rd/types";

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-fg-2",
};

export function isTransferring(torrent: Torrent): boolean {
  return torrent.status === "downloading" || torrent.status === "compressing" || torrent.status === "uploading";
}

export function TorrentMeta({ torrent, className }: { torrent: Torrent; className?: string }): ReactNode {
  const status = STATUS[torrent.status];
  const parts: string[] = [];
  if (isTransferring(torrent)) {
    parts.push(`${Math.round(torrent.progress)}%`);
    if (torrent.speed) parts.push(formatSpeed(torrent.speed));
  }
  if (torrent.bytes) parts.push(formatBytes(torrent.bytes));
  parts.push(formatRelative(torrent.ended ?? torrent.added));
  return (
    <span className={clsx("tabular flex min-w-0 items-center gap-1.5 text-[12px] text-fg-3", className)}>
      <span className={clsx("shrink-0 font-medium", TONE_TEXT[status.tone])}>{status.label}</span>
      <span className="truncate">· {parts.join(" · ")}</span>
    </span>
  );
}
