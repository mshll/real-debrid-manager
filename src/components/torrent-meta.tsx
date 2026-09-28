import clsx from "clsx";
import type { ReactNode } from "react";

import { formatBytes, formatRelative, formatSpeed, STATUS, type Tone } from "@/lib/format";
import type { Torrent } from "@/lib/rd/types";

import { Progress } from "./ui/progress";

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-fg-2",
};

export function TorrentMeta({
  torrent,
  showSize = true,
  className,
}: {
  torrent: Torrent;
  showSize?: boolean;
  className?: string;
}): ReactNode {
  const status = STATUS[torrent.status];
  const parts: string[] = [];
  if (torrent.status === "downloading" || torrent.status === "compressing" || torrent.status === "uploading") {
    parts.push(`${Math.round(torrent.progress)}%`);
    if (torrent.speed) parts.push(formatSpeed(torrent.speed));
    if (torrent.seeders !== undefined) parts.push(`${torrent.seeders} seeders`);
  }
  if (showSize && torrent.bytes) parts.push(formatBytes(torrent.bytes));
  parts.push(formatRelative(torrent.ended ?? torrent.added));
  return (
    <span className={clsx("tabular flex min-w-0 items-center gap-1.5 text-[11.5px] text-fg-2", className)}>
      <span className={clsx("shrink-0 font-medium", TONE_TEXT[status.tone])}>{status.label}</span>
      <span className="truncate">· {parts.join(" · ")}</span>
    </span>
  );
}

export function TorrentProgress({ torrent, className }: { torrent: Torrent; className?: string }): ReactNode {
  if (!STATUS[torrent.status].active || torrent.status === "waiting_files_selection") return null;
  // An empty track under queued/converting rows reads as a stalled download.
  if (!torrent.progress) return null;
  return (
    <Progress value={torrent.status === "magnet_conversion" ? 0 : torrent.progress} tone="info" className={className} />
  );
}
