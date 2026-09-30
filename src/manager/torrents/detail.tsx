import {
  ArrowClockwiseIcon,
  CopyIcon,
  DownloadSimpleIcon,
  ListChecksIcon,
  MagnetStraightIcon,
  PaperPlaneTiltIcon,
  PlayIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FileIcon } from "@/components/file-icon";
import { StatusIcon } from "@/components/status-icon";
import { isTransferring, TONE_TEXT } from "@/components/torrent-meta";
import { Button, IconButton } from "@/components/ui/button";
import { Progress, Skeleton } from "@/components/ui/progress";
import { useActions } from "@/hooks/use-actions";
import { useReinsert } from "@/hooks/use-torrent-mutations";
import { formatBytes, formatDate, formatSpeed, STATUS } from "@/lib/format";
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
    <aside className="flex w-[420px] shrink-0 flex-col border-l border-border">
      <div className="flex h-13 shrink-0 items-center gap-1 border-b border-border px-3">
        {torrent && (
          <span className="flex min-w-0 items-center gap-2 pl-1">
            <StatusIcon status={torrent.status} progress={torrent.progress} />
            <span className={clsx("text-[13px] font-medium", TONE_TEXT[STATUS[torrent.status].tone])}>
              {STATUS[torrent.status].label}
            </span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5">
          {torrent && (
            <>
              <IconButton
                label="Copy magnet"
                onClick={() => copyText(`magnet:?xt=urn:btih:${torrent.hash}`, "Magnet copied")}
              >
                <MagnetStraightIcon />
              </IconButton>
              <IconButton label="Reinsert" onClick={() => reinsert(torrent)}>
                <ArrowClockwiseIcon />
              </IconButton>
              <IconButton label="Delete" className="hover:text-danger!" onClick={() => onDelete(torrent)}>
                <TrashIcon />
              </IconButton>
              <span className="mx-1 h-4 w-px bg-border" />
            </>
          )}
          <IconButton label="Close" shortcut="Esc" onClick={() => navigate("/torrents")}>
            <XIcon />
          </IconButton>
        </span>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-8 w-full" />
        </div>
      ) : error || !torrent ? (
        <EmptyState
          icon={<MagnetStraightIcon />}
          title="Torrent not found"
          description="It may have been deleted on another device."
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-5">
            <h2 className="text-[16px] leading-snug font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">
              {torrent.filename || "Fetching info"}
            </h2>

            {isTransferring(torrent) && <TransferCard torrent={torrent} />}

            <div className="mt-4 flex flex-wrap gap-2">
              {torrent.status === "waiting_files_selection" && (
                <Button variant="primary" icon={<ListChecksIcon />} onClick={() => onChooseFiles(torrent.id)}>
                  Choose files
                </Button>
              )}
              {torrent.status === "downloaded" && torrent.links.length > 0 && (
                <>
                  <Button
                    variant="primary"
                    icon={<DownloadSimpleIcon />}
                    onClick={() => actions.download(torrent.links)}
                  >
                    {torrent.links.length > 1 ? `Download ${torrent.links.length}` : "Download"}
                  </Button>
                  {torrent.links.length === 1 && isVideo(torrent.filename) && torrent.links[0] && (
                    <Button icon={<PlayIcon />} onClick={() => torrent.links[0] && actions.stream(torrent.links[0])}>
                      Stream
                    </Button>
                  )}
                  <Button icon={<CopyIcon />} onClick={() => actions.copy(torrent.links)}>
                    Copy
                  </Button>
                  <Button icon={<PaperPlaneTiltIcon />} onClick={() => actions.aria2(torrent.links)}>
                    aria2
                  </Button>
                </>
              )}
            </div>
          </div>

          <Section title="Properties">
            <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2.5 text-[13px]">
              <Fact label="Size">{torrent.bytes ? formatBytes(torrent.bytes) : "—"}</Fact>
              {formatBytes(torrent.original_bytes) !== formatBytes(torrent.bytes) && (
                <Fact label="Full torrent">{formatBytes(torrent.original_bytes)}</Fact>
              )}
              <Fact label="Added">{formatDate(torrent.added)}</Fact>
              {torrent.ended && <Fact label="Finished">{formatDate(torrent.ended)}</Fact>}
              <Fact label="Hash">
                <button
                  type="button"
                  className="group/hash flex max-w-full items-center gap-1.5 text-fg-2 hover:text-fg"
                  onClick={() => copyText(torrent.hash, "Hash copied")}
                >
                  <span className="truncate font-mono text-[12px]">{torrent.hash}</span>
                  <CopyIcon className="size-3.5 shrink-0 opacity-0 group-hover/hash:opacity-100" />
                </button>
              </Fact>
            </dl>
          </Section>

          <FileList files={torrent.files} links={torrent.links} ready={torrent.status === "downloaded"} />
        </div>
      )}
    </aside>
  );
}

function TransferCard({ torrent }: { torrent: Torrent }): ReactNode {
  const left = torrent.bytes * (1 - torrent.progress / 100);
  const eta = torrent.status === "downloading" && torrent.speed ? left / torrent.speed : null;
  return (
    <div className="mt-4 rounded-[10px] bg-subtle p-4 shadow-panel dark:bg-surface">
      <div className="tabular flex items-baseline justify-between">
        <span className="text-[22px] font-semibold tracking-[-0.02em]">{Math.round(torrent.progress)}%</span>
        <span className="text-[12px] text-fg-3">{eta !== null ? `${formatDuration(eta)} left` : ""}</span>
      </div>
      <Progress value={torrent.progress} tone="info" className="mt-2.5" />
      <div className="tabular mt-3 flex gap-5 text-[12px]">
        {torrent.speed !== undefined && <Stat label="Speed" value={formatSpeed(torrent.speed)} />}
        {torrent.seeders !== undefined && <Stat label="Seeders" value={String(torrent.seeders)} />}
        {torrent.bytes > 0 && <Stat label="Remaining" value={formatBytes(left)} />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <span>
      <span className="block text-fg-3">{label}</span>
      <span className="font-medium text-fg">{value}</span>
    </span>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }): ReactNode {
  return (
    <section className="border-t border-border px-5 py-4">
      <h3 className="mb-3 flex items-baseline gap-2 text-[12px] font-medium text-fg-3">
        {title}
        {aside}
      </h3>
      {children}
    </section>
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
    <Section
      title="Files"
      aside={
        <span className="tabular text-fg-4">
          {selected.length !== files.length ? `${selected.length} of ${files.length}` : files.length}
        </span>
      }
    >
      {ready && !perFile && links.length > 0 && (
        <p className="mb-3 rounded-[8px] bg-fill px-3 py-2 text-[12px] text-fg-2">
          Real-Debrid packed these files into {links.length === 1 ? "one archive" : `${links.length} archives`}.
        </p>
      )}
      <div className="-mx-2 flex flex-col">
        {files.map((file) => {
          const link = linkFor(file);
          return (
            <div
              key={file.id}
              className={clsx(
                "group flex h-9 items-center gap-2.5 rounded-[6px] px-2 hover:bg-fill",
                file.selected === 0 && "opacity-40",
              )}
            >
              <FileIcon name={file.path} />
              <span className="min-w-0 flex-1 truncate text-[13px]" title={file.path}>
                {fileName(file.path)}
              </span>
              {link && (
                <span className="hidden gap-0.5 group-focus-within:flex group-hover:flex">
                  {(isVideo(file.path) || isAudio(file.path)) && (
                    <IconButton size="sm" label="Stream" onClick={() => actions.stream(link)}>
                      <PlayIcon />
                    </IconButton>
                  )}
                  <IconButton size="sm" label="Copy link" onClick={() => actions.copy([link])}>
                    <CopyIcon />
                  </IconButton>
                  <IconButton size="sm" label="Download" onClick={() => actions.download([link])}>
                    <DownloadSimpleIcon />
                  </IconButton>
                </span>
              )}
              <span
                className={clsx(
                  "tabular text-[12px] text-fg-3",
                  link && "group-focus-within:hidden group-hover:hidden",
                )}
              >
                {formatBytes(file.bytes)}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return "under a minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

function copyText(text: string, message: string): void {
  navigator.clipboard.writeText(text).then(() => toast.success(message), console.error);
}
