import clsx from "clsx";
import { FileArchive, FileAudio, FileText, FileVideo, File as FileGeneric, Folder, Magnet } from "lucide-react";
import type { ReactNode } from "react";

import { isAudio, isVideo } from "@/lib/select";

export function FileIcon({
  name,
  kind,
  className,
}: {
  name: string;
  kind?: "torrent" | "folder" | "magnet";
  className?: string;
}): ReactNode {
  const classes = clsx("size-4 shrink-0", className);
  if (kind === "magnet") return <Magnet className={clsx(classes, "text-accent")} />;
  if (kind === "folder") return <Folder className={clsx(classes, "text-info")} />;
  if (isVideo(name)) return <FileVideo className={clsx(classes, "text-info")} />;
  if (isAudio(name)) return <FileAudio className={clsx(classes, "text-[#c77dff]")} />;
  if (/\.(rar|zip|7z|tar|gz)$/i.test(name)) return <FileArchive className={clsx(classes, "text-warning")} />;
  if (/\.(srt|ass|sub|vtt|nfo|txt)$/i.test(name)) return <FileText className={clsx(classes, "text-fg-3")} />;
  // Multi-file torrents are named after their folder and have no extension.
  if (name && !/\.[a-z0-9]{2,4}$/i.test(name)) return <Folder className={clsx(classes, "text-fg-3")} />;
  return <FileGeneric className={clsx(classes, "text-fg-3")} />;
}
