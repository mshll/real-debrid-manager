import { CopyIcon, DownloadSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { FileIcon } from "@/components/file-icon";
import { Button, IconButton } from "@/components/ui/button";
import { useActions } from "@/hooks/use-actions";
import { formatBytes } from "@/lib/format";
import { useDownloads } from "@/lib/queries";
import type { Download, Unrestricted } from "@/lib/rd/types";

import { ListEmpty, ListSkeleton } from "./list-states";
import { PopupRow } from "./row";

type Item = Pick<Download, "id" | "filename" | "filesize" | "download" | "streamable">;

/** `fresh` are links unlocked while the popup is open; they lead the list even before RD's history catches up. */
export function RecentDownloads({ fresh }: { fresh: Unrestricted[] }): ReactNode {
  const { data: downloads, isLoading } = useDownloads();
  const actions = useActions();
  const freshIds = new Set(fresh.map((item) => item.id));
  const earlier = (downloads ?? []).filter((item) => !freshIds.has(item.id));
  const urls = fresh.map((item) => item.download);

  if (isLoading && !fresh.length) return <ListSkeleton />;
  if (!fresh.length && !earlier.length) {
    return (
      <ListEmpty
        icon={<DownloadSimpleIcon />}
        title="No downloads yet"
        description="Hoster links you unlock show up here, ready to download."
      />
    );
  }
  return (
    <div className="flex flex-col">
      {fresh.length > 0 && (
        <>
          <GroupLabel label={`Just unlocked · ${fresh.length}`}>
            {fresh.length > 1 && (
              <>
                <Button size="sm" variant="ghost" icon={<CopyIcon />} onClick={() => actions.copy(urls)}>
                  Copy all
                </Button>
                <Button size="sm" variant="ghost" icon={<DownloadSimpleIcon />} onClick={() => actions.download(urls)}>
                  Download all
                </Button>
              </>
            )}
          </GroupLabel>
          {fresh.map((item) => (
            <DownloadRow key={item.id} item={item} />
          ))}
          {earlier.length > 0 && <GroupLabel label="Earlier" />}
        </>
      )}
      {earlier.map((item) => (
        <DownloadRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function GroupLabel({ label, children }: { label: string; children?: ReactNode }): ReactNode {
  return (
    <div className="flex h-9 items-center gap-0.5 px-2 pt-1 first:pt-0">
      <span className="tabular flex-1 text-[12px] font-medium text-fg-3">{label}</span>
      {children}
    </div>
  );
}

function DownloadRow({ item }: { item: Item }): ReactNode {
  const actions = useActions();
  return (
    <PopupRow
      icon={<FileIcon name={item.filename} />}
      title={item.filename}
      meta={formatBytes(item.filesize)}
      onClick={() => actions.primary([item.download])}
      actions={
        <>
          {item.streamable === 1 && (
            <IconButton size="sm" label="Stream" onClick={() => actions.stream(item.download, item.id)}>
              <PlayIcon />
            </IconButton>
          )}
          <IconButton size="sm" label="Copy link" onClick={() => actions.copy([item.download])}>
            <CopyIcon />
          </IconButton>
          <IconButton size="sm" label="Download" onClick={() => actions.download([item.download])}>
            <DownloadSimpleIcon />
          </IconButton>
        </>
      }
    />
  );
}
