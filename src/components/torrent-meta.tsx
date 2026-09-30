import type { Tone } from "@/lib/format";
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
