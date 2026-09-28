import clsx from "clsx";
import { Copy, Download, ListChecks, Play, RotateCw, Send, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { FileIcon } from "@/components/file-icon";
import { TONE_TEXT } from "@/components/torrent-meta";
import { Button, IconButton } from "@/components/ui/button";
import { Progress, Spinner } from "@/components/ui/progress";
import { useActions } from "@/hooks/use-actions";
import { useReinsert } from "@/hooks/use-torrent-mutations";
import { formatBytes, formatDate, formatSpeed, isActive, STATUS } from "@/lib/format";
import { useTorrent } from "@/lib/queries";
import type { Torrent, TorrentFile } from "@/lib/rd/types";
import { fileName, isAudio, isVideo } from "@/lib/select";

import { navigate } from "../router";

export function TorrentDetail({
  id,
  onChooseFiles,
  onDelete,
}: {
  id: string;
  onChooseFiles: (id: string) => void;
  onDelete: (torrent: Torrent) => void;
}): ReactNode {
  const { data: torrent, isLoading, error } = useTorrent(id);
  const actions = useActions();
  const reinsert = useReinsert();

  return (
    <aside className="flex w-[380px] shrink-0 flex-col bg-bg shadow-[inset_0.5px_0_0_var(--separator)]">
      <div className="hairline-b flex h-[52px] shrink-0 items-center justify-between px-4">
        <span className="text-[12px] font-semibold text-fg-2">Details</span>
        <IconButton label="Close" onClick={() => navigate("/torrents")}>
          <X />
        </IconButton>
      </div>
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-fg-3">
          <Spinner />
        </div>
      ) : error || !torrent ? (
        <p className="p-6 text-[13px] text-danger">This torrent no longer exists.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <h2 className="text-[14px] leading-snug font-semibold break-words">{torrent.filename || "Fetching info"}</h2>
          <div className={clsx("mt-1 text-[12px] font-medium", TONE_TEXT[STATUS[torrent.status].tone])}>
            {STATUS[torrent.status].label}
          </div>

          {isActive(torrent.status) && torrent.status !== "waiting_files_selection" && (
            <div className="mt-3">
              <Progress value={torrent.progress} tone="info" />
              <div className="tabular mt-1.5 flex justify-between text-[11.5px] text-fg-2">
                <span>{Math.round(torrent.progress)}%</span>
                <span>
                  {torrent.speed ? formatSpeed(torrent.speed) : ""}
                  {torrent.seeders !== undefined ? ` · ${torrent.seeders} seeders` : ""}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {torrent.status === "waiting_files_selection" && (
              <Button
                variant="primary"
                size="sm"
                icon={<ListChecks className="size-3.5" />}
                onClick={() => onChooseFiles(torrent.id)}
              >
                Choose files
              </Button>
            )}
            {torrent.status === "downloaded" && torrent.links.length > 0 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download className="size-3.5" />}
                  onClick={() => actions.download(torrent.links)}
                >
                  {torrent.links.length > 1 ? `Download ${torrent.links.length}` : "Download"}
                </Button>
                <Button size="sm" icon={<Copy className="size-3.5" />} onClick={() => actions.copy(torrent.links)}>
                  Copy links
                </Button>
                <Button size="sm" icon={<Send className="size-3.5" />} onClick={() => actions.aria2(torrent.links)}>
                  aria2
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCw className="size-3.5" />}
              onClick={() => reinsert(torrent)}
            >
              Reinsert
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              icon={<Trash2 className="size-3.5" />}
              onClick={() => onDelete(torrent)}
            >
              Delete
            </Button>
          </div>

          <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-1.5 text-[12px]">
            <Fact label="Size">{formatBytes(torrent.bytes)}</Fact>
            {formatBytes(torrent.original_bytes) !== formatBytes(torrent.bytes) && (
              <Fact label="Full size">{formatBytes(torrent.original_bytes)}</Fact>
            )}
            <Fact label="Added">{formatDate(torrent.added)}</Fact>
            {torrent.ended && <Fact label="Finished">{formatDate(torrent.ended)}</Fact>}
            <Fact label="Hash">
              <button
                type="button"
                className="truncate font-mono text-[11px] text-fg-2 hover:text-fg"
                title="Copy hash"
                onClick={() =>
                  navigator.clipboard.writeText(torrent.hash).then(() => toast.success("Hash copied"), console.error)
                }
              >
                {torrent.hash}
              </button>
            </Fact>
          </dl>

          <FileList files={torrent.files} links={torrent.links} ready={torrent.status === "downloaded"} />
        </div>
      )}
    </aside>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <>
      <dt className="text-fg-3">{label}</dt>
      <dd className="tabular min-w-0 truncate text-fg">{children}</dd>
    </>
  );
}

/**
 * RD returns one link per selected file only when every selected file is a
 * media type; otherwise it packs the selection into a single archive link.
 */
function FileList({ files, links, ready }: { files: TorrentFile[]; links: string[]; ready: boolean }): ReactNode {
  const actions = useActions();
  const selected = files.filter((file) => file.selected === 1);
  const perFile = ready && links.length === selected.length;
  const linkFor = (file: TorrentFile): string | undefined => (perFile ? links[selected.indexOf(file)] : undefined);

  return (
    <div className="mt-6">
      <h3 className="mb-1.5 text-[12px] font-semibold text-fg-2">
        Files{" "}
        <span className="font-normal text-fg-3">
          {selected.length !== files.length ? `${selected.length} of ${files.length} selected` : files.length}
        </span>
      </h3>
      {ready && !perFile && links.length > 0 && (
        <p className="mb-2 text-[11.5px] text-fg-3">
          Real-Debrid packed these files into {links.length === 1 ? "one archive" : `${links.length} archives`}.
        </p>
      )}
      <div className="[&>*+*]:hairline-t overflow-hidden rounded-[10px] bg-surface shadow-card">
        {files.map((file) => {
          const link = linkFor(file);
          return (
            <div
              key={file.id}
              className={clsx("group flex h-9 items-center gap-2.5 px-2.5", file.selected === 0 && "opacity-45")}
            >
              <FileIcon name={file.path} />
              <span className="min-w-0 flex-1 truncate text-[12px]" title={file.path}>
                {fileName(file.path)}
              </span>
              {link ? (
                <span className="flex opacity-0 group-hover:opacity-100">
                  {(isVideo(file.path) || isAudio(file.path)) && (
                    <IconButton size="sm" label="Stream" onClick={() => actions.stream(link)}>
                      <Play />
                    </IconButton>
                  )}
                  <IconButton size="sm" label="Copy link" onClick={() => actions.copy([link])}>
                    <Copy />
                  </IconButton>
                  <IconButton size="sm" label="Download" onClick={() => actions.download([link])}>
                    <Download />
                  </IconButton>
                </span>
              ) : null}
              <span className={clsx("tabular text-[11.5px] text-fg-3", link && "group-hover:hidden")}>
                {formatBytes(file.bytes)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
