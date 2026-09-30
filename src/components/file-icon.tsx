import {
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon as FileGenericIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderSimpleIcon,
  MagnetStraightIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
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
  const classes = clsx("size-4 shrink-0 text-fg-3", className);
  if (kind === "magnet") return <MagnetStraightIcon className={clsx(classes, "text-accent!")} />;
  if (kind === "folder") return <FolderSimpleIcon className={classes} />;
  if (isVideo(name)) return <FileVideoIcon className={classes} />;
  if (isAudio(name)) return <FileAudioIcon className={classes} />;
  if (/\.(rar|zip|7z|tar|gz)$/i.test(name)) return <FileArchiveIcon className={classes} />;
  if (/\.(srt|ass|sub|vtt|nfo|txt)$/i.test(name)) return <FileTextIcon className={classes} />;
  // Multi-file torrents are named after their folder and have no extension.
  if (name && !/\.[a-z0-9]{2,4}$/i.test(name)) return <FolderSimpleIcon className={classes} />;
  return <FileGenericIcon className={classes} />;
}
