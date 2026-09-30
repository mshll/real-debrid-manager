import {
  CopyIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Confirm, type ConfirmRequest } from "@/components/confirm";
import { EmptyState } from "@/components/empty-state";
import { FileIcon } from "@/components/file-icon";
import { Button, IconButton } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/progress";
import { useActions } from "@/hooks/use-actions";
import { formatBytes, formatRelative } from "@/lib/format";
import { keys, useDownloads } from "@/lib/queries";
import { deleteDownload } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Download as DownloadItem } from "@/lib/rd/types";

import { SearchField, SelectionBar, Toolbar } from "./toolbar";
import { useSelection } from "./use-selection";

const ROW = 44;

const COLUMNS = {
  check: "w-5 shrink-0",
  host: "hidden w-40 shrink-0 truncate @2xl:block",
  size: "hidden w-20 shrink-0 text-right @xl:block",
  date: "hidden w-28 shrink-0 text-right @3xl:block",
  actions: "flex w-24 shrink-0 justify-end gap-0.5",
};

export function DownloadsView(): ReactNode {
  const { data: downloads = [], isLoading, error } = useDownloads();
  const queryClient = useQueryClient();
  const actions = useActions();
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? downloads.filter((d) => d.filename.toLowerCase().includes(needle) || d.host.includes(needle))
      : downloads;
  }, [downloads, query]);
  const ids = useMemo(() => visible.map((d) => d.id), [visible]);
  const selection = useSelection(ids);
  const selected = visible.filter((d) => selection.has(d.id));
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW,
    overscan: 12,
  });

  const remove = (list: DownloadItem[]): void =>
    setConfirm({
      title: `Remove ${list.length} download${list.length === 1 ? "" : "s"}?`,
      description: "Their links stop working. The files stay in any torrents they came from.",
      action: "Remove",
      onConfirm: () => {
        const id = toast.loading("Removing");
        (async () => {
          for (const item of list) await deleteDownload(item.id);
          selection.clear();
          await queryClient.invalidateQueries({ queryKey: keys.downloads });
          toast.success(`Removed ${list.length}`, { id });
        })().catch((err: unknown) => toast.error(errorMessage(err), { id }));
      },
    });

  const allSelected = visible.length > 0 && selection.count === visible.length;

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <Toolbar title="Downloads" subtitle={downloads.length ? `${visible.length} of ${downloads.length}` : undefined}>
        <SearchField value={query} onChange={setQuery} placeholder="Search downloads" />
      </Toolbar>
      <div className="@container flex min-h-0 flex-1 flex-col">
        {visible.length > 0 && (
          <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border px-5 text-[12px] font-medium text-fg-3">
            <span className={COLUMNS.check}>
              <button
                type="button"
                role="checkbox"
                aria-checked={allSelected}
                aria-label="Select all"
                onClick={() => selection.setAll(!allSelected)}
                className="-m-1.5 flex p-1.5"
              >
                <CheckMark checked={allSelected} indeterminate={selection.count > 0 && !allSelected} />
              </button>
            </span>
            <span className="w-4 shrink-0" />
            <span className="flex-1">Name</span>
            <span className={COLUMNS.host}>Host</span>
            <span className={COLUMNS.size}>Size</span>
            <span className={COLUMNS.date}>Created</span>
            <span className={COLUMNS.actions} />
          </div>
        )}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-24">
          {isLoading ? (
            <div>
              {[58, 44, 67, 51, 62].map((width, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-border px-5"
                  style={{ height: ROW }}
                >
                  <span className="w-5" />
                  <Skeleton className="size-4" />
                  <Skeleton style={{ width: `${width}%` }} />
                  <Skeleton className="ml-auto w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState icon={<LinkSimpleIcon />} title="Couldn't load downloads" description={errorMessage(error)} />
          ) : !visible.length ? (
            query ? (
              <EmptyState icon={<MagnifyingGlassIcon />} title="No matches" description={`Nothing matches "${query}".`}>
                <Button onClick={() => setQuery("")}>Clear search</Button>
              </EmptyState>
            ) : (
              <EmptyState
                icon={<LinkSimpleIcon />}
                title="No downloads yet"
                description="Every link you unrestrict, from torrents or file hosters, shows up here for a while."
              />
            )
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((row) => {
                const item = visible[row.index];
                if (!item) return null;
                const isSelected = selection.has(item.id);
                return (
                  <div
                    key={item.id}
                    style={{ position: "absolute", inset: "0 0 auto 0", transform: `translateY(${row.start}px)` }}
                  >
                    <div
                      role="row"
                      aria-selected={isSelected}
                      className={clsx(
                        "group flex items-center gap-3 border-b border-border px-5 transition-colors duration-100",
                        isSelected ? "bg-accent-soft" : "hover:bg-fill",
                      )}
                      style={{ height: ROW }}
                      onClick={(event) =>
                        selection.count > 0 || event.metaKey || event.shiftKey
                          ? selection.toggle(item.id, row.index, event.shiftKey)
                          : undefined
                      }
                      onDoubleClick={() => actions.primary([item.download])}
                    >
                      <span className={COLUMNS.check}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label="Select"
                          onClick={(event) => {
                            event.stopPropagation();
                            selection.toggle(item.id, row.index, event.shiftKey);
                          }}
                          className={clsx(
                            "-m-1.5 flex p-1.5 transition-opacity duration-100",
                            selection.count || isSelected
                              ? ""
                              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                          )}
                        >
                          <CheckMark checked={isSelected} />
                        </button>
                      </span>
                      <FileIcon name={item.filename} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={item.filename}>
                        {item.filename}
                      </span>
                      <span className={clsx(COLUMNS.host, "text-[13px] text-fg-2")}>{item.host}</span>
                      <span className={clsx(COLUMNS.size, "tabular text-[13px] text-fg-2")}>
                        {formatBytes(item.filesize)}
                      </span>
                      <span className={clsx(COLUMNS.date, "tabular truncate text-[13px] text-fg-3")}>
                        {formatRelative(item.generated)}
                      </span>
                      <span className={COLUMNS.actions} onClick={(event) => event.stopPropagation()}>
                        {item.streamable === 1 && (
                          <IconButton
                            label="Stream"
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => actions.stream(item.download, item.id)}
                          >
                            <PlayIcon />
                          </IconButton>
                        )}
                        <IconButton
                          label="Download"
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => actions.download([item.download])}
                        >
                          <DownloadSimpleIcon />
                        </IconButton>
                        <Menu
                          trigger={
                            <IconButton
                              label="More"
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                            >
                              <DotsThreeIcon />
                            </IconButton>
                          }
                          items={[
                            { label: "Copy link", icon: <CopyIcon />, onSelect: () => actions.copy([item.download]) },
                            {
                              label: "Send to aria2",
                              icon: <PaperPlaneTiltIcon />,
                              onSelect: () => actions.aria2([item.download]),
                            },
                            "separator",
                            { label: "Remove", icon: <TrashIcon />, danger: true, onSelect: () => remove([item]) },
                          ]}
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {selection.count > 0 && (
        <SelectionBar
          count={selection.count}
          detail={formatBytes(selected.reduce((sum, d) => sum + d.filesize, 0))}
          onClear={selection.clear}
        >
          <Button
            size="sm"
            variant="ghost"
            icon={<DownloadSimpleIcon />}
            onClick={() => actions.download(selected.map((d) => d.download))}
          >
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<CopyIcon />}
            onClick={() => actions.copy(selected.map((d) => d.download))}
          >
            Copy links
          </Button>
          <Button size="sm" variant="danger" icon={<TrashIcon />} onClick={() => remove(selected)}>
            Remove
          </Button>
        </SelectionBar>
      )}
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </section>
  );
}
