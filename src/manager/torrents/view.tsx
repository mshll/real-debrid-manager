import {
  ArrowClockwiseIcon,
  BroomIcon,
  CopyIcon,
  DownloadSimpleIcon,
  MagnetStraightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SortAscendingIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Confirm, type ConfirmRequest } from "@/components/confirm";
import { EmptyState } from "@/components/empty-state";
import { FilePicker } from "@/components/file-picker";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { useActions } from "@/hooks/use-actions";
import { reinsertTorrent, useReinsert } from "@/hooks/use-torrent-mutations";
import { formatBytes, formatSpeed, isActive, isFailed } from "@/lib/format";
import { keys, useLibrary } from "@/lib/queries";
import { deleteTorrent } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";

import { navigate } from "../router";
import { SearchField, SelectionBar, Toolbar } from "../toolbar";
import { useSelection } from "../use-selection";
import { duplicateTorrents, failedTorrents } from "./cleanup";
import { TorrentDetail } from "./detail";
import { COLUMNS, ROW_HEIGHT, TorrentRow } from "./row";

type Filter = "all" | "active" | "ready" | "failed";
type Sort = "added" | "name" | "size";

const FILTERS: Record<Filter, (torrent: Torrent) => boolean> = {
  all: () => true,
  active: (t) => isActive(t.status),
  ready: (t) => t.status === "downloaded",
  failed: (t) => isFailed(t.status),
};

const SORTS: { value: Sort; label: string; compare: (a: Torrent, b: Torrent) => number }[] = [
  { value: "added", label: "Newest first", compare: (a, b) => Date.parse(b.added) - Date.parse(a.added) },
  { value: "name", label: "Name", compare: (a, b) => a.filename.localeCompare(b.filename) },
  { value: "size", label: "Largest first", compare: (a, b) => b.bytes - a.bytes },
];

export function TorrentsView({ detailId, onAdd }: { detailId: string | null; onAdd: () => void }): ReactNode {
  const { torrents, isLoading, error } = useLibrary();
  const queryClient = useQueryClient();
  const actions = useActions();
  const reinsert = useReinsert();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("added");
  const [rawCursor, setCursor] = useState<number | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const compare = SORTS.find((option) => option.value === sort)?.compare;
    return torrents
      .filter(FILTERS[filter])
      .filter((t) => !needle || t.filename.toLowerCase().includes(needle) || t.hash === needle)
      .sort(compare);
  }, [torrents, filter, query, sort]);
  const ids = useMemo(() => visible.map((t) => t.id), [visible]);
  const cursor = rawCursor !== null && rawCursor < ids.length ? rawCursor : null;
  const selection = useSelection(ids);
  const selected = visible.filter((t) => selection.has(t.id));

  const stats = useMemo(() => {
    const active = torrents.filter(FILTERS.active);
    return {
      active: active.length,
      ready: torrents.filter(FILTERS.ready).length,
      failed: torrents.filter(FILTERS.failed).length,
      downloading: active.filter((t) => t.status === "downloading").length,
      speed: active.reduce((sum, t) => sum + (t.speed ?? 0), 0),
    };
  }, [torrents]);
  const failed = useMemo(() => failedTorrents(torrents), [torrents]);
  const duplicates = useMemo(() => duplicateTorrents(torrents), [torrents]);

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (typing || document.querySelector("[role=dialog][data-open],[role=menu][data-open]")) return;
      if ((event.metaKey || event.ctrlKey || event.altKey) && event.key !== "a") return;
      const move = (delta: number): void => {
        event.preventDefault();
        const from = cursor ?? (detailId ? ids.indexOf(detailId) : -1);
        const next = Math.max(0, Math.min(ids.length - 1, from + delta));
        setCursor(next);
        virtualizer.scrollToIndex(next);
        const id = ids[next];
        if (detailId && id) navigate(`/torrents/${id}`);
      };
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if ((event.metaKey || event.ctrlKey) && event.key === "a") {
        event.preventDefault();
        selection.setAll(true);
      } else if (event.key === "ArrowDown" || event.key === "j") move(1);
      else if (event.key === "ArrowUp" || event.key === "k") move(-1);
      else if (event.key === "Enter" && cursor !== null && ids[cursor]) navigate(`/torrents/${ids[cursor]}`);
      else if (event.key === "x" && cursor !== null && ids[cursor]) selection.toggle(ids[cursor], cursor, false);
      else if (event.key === "Escape") {
        if (selection.count) selection.clear();
        else if (detailId) navigate("/torrents");
        else setCursor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, detailId, cursor, ids, virtualizer]);

  const removeMany = (list: Torrent[], label: string): void => {
    setConfirm({
      title: list.length === 1 ? "Delete this torrent?" : `Delete ${list.length} torrents?`,
      description: `${label} This can't be undone.`.trim(),
      action: "Delete",
      onConfirm: () => {
        const id = toast.loading(`Deleting ${list.length}`);
        (async () => {
          for (const torrent of list) await deleteTorrent(torrent.id);
          selection.clear();
          if (detailId && list.some((torrent) => torrent.id === detailId)) navigate("/torrents");
          await queryClient.invalidateQueries({ queryKey: keys.torrents });
          toast.success(list.length === 1 ? "Deleted" : `Deleted ${list.length}`, { id });
        })().catch((err: unknown) => toast.error(errorMessage(err), { id }));
      },
    });
  };

  const reinsertMany = (list: Torrent[]): void => {
    const id = toast.loading(`Reinserting ${list.length}`);
    (async () => {
      for (const torrent of list) await reinsertTorrent(torrent);
      selection.clear();
      await queryClient.invalidateQueries({ queryKey: keys.torrents });
      toast.success(`Reinserted ${list.length}`, { id });
    })().catch((err: unknown) => toast.error(errorMessage(err), { id }));
  };

  const readySelected = selected.filter((t) => t.status === "downloaded");
  const allSelected = visible.length > 0 && selection.count === visible.length;

  return (
    <div className="flex min-w-0 flex-1">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar title="Torrents" subtitle={torrents.length ? `${visible.length} of ${torrents.length}` : undefined}>
          <SearchField
            value={query}
            onChange={(next) => {
              setQuery(next);
              setCursor(null);
            }}
            inputRef={searchRef}
            placeholder="Search torrents"
          />
          <Menu
            trigger={
              <Button variant="ghost" size="sm" icon={<SortAscendingIcon />}>
                <span className="sr-only @3xl:not-sr-only">{SORTS.find((option) => option.value === sort)?.label}</span>
              </Button>
            }
            items={[
              { heading: "Sort by" },
              ...SORTS.map((option) => ({
                label: option.label,
                checked: sort === option.value,
                onSelect: () => {
                  setSort(option.value);
                  setCursor(null);
                },
              })),
            ]}
          />
          <Menu
            trigger={
              <Button variant="ghost" size="sm" icon={<BroomIcon />}>
                <span className="sr-only @3xl:not-sr-only">Clean up</span>
              </Button>
            }
            items={[
              { heading: "Clean up" },
              {
                label: "Remove failed",
                hint: String(failed.length),
                icon: <TrashIcon />,
                disabled: !failed.length,
                onSelect: () => removeMany(failed, "Failed, dead and errored torrents will be removed."),
              },
              {
                label: "Remove duplicates",
                hint: String(duplicates.length),
                icon: <CopyIcon />,
                disabled: !duplicates.length,
                onSelect: () => removeMany(duplicates, "The best copy of each torrent is kept."),
              },
              {
                label: "Reinsert failed",
                hint: String(failed.length),
                icon: <ArrowClockwiseIcon />,
                disabled: !failed.length,
                onSelect: () => reinsertMany(failed),
              },
            ]}
          />
          <Button variant="primary" size="sm" icon={<PlusIcon />} onClick={onAdd}>
            Add
          </Button>
        </Toolbar>

        <div className="gutter flex h-11 shrink-0 items-center gap-4 border-b border-border">
          <Tabs
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setCursor(null);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active", count: stats.active },
              { value: "ready", label: "Ready", count: stats.ready },
              { value: "failed", label: "Failed", count: stats.failed },
            ]}
          />
          {stats.downloading > 0 && (
            <span className="tabular ml-auto flex items-center gap-2 truncate text-[12px] text-fg-3">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-info opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-info" />
              </span>
              {stats.downloading} downloading · {formatSpeed(stats.speed)}
            </span>
          )}
        </div>

        <div className="@container flex min-h-0 flex-1 flex-col">
          {visible.length > 0 && (
            <div className="gutter flex h-9 shrink-0 items-center gap-3 border-b border-border text-[12px] font-medium text-fg-3">
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
              <span className="w-3.5 shrink-0" />
              <span className="flex-1">Name</span>
              <span className={COLUMNS.size}>Size</span>
              <span className={COLUMNS.actions} />
            </div>
          )}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-24">
            {isLoading ? (
              <LoadingRows />
            ) : error ? (
              <EmptyState
                icon={<MagnetStraightIcon />}
                title="Couldn't load torrents"
                description={errorMessage(error)}
              />
            ) : !visible.length ? (
              query || filter !== "all" ? (
                <EmptyState
                  icon={<MagnifyingGlassIcon />}
                  title="No matches"
                  description={query ? `Nothing matches "${query}".` : "No torrents in this view."}
                >
                  <Button
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={<MagnetStraightIcon />}
                  title="Your library is empty"
                  description="Add a magnet, drop a .torrent file anywhere on this page, or right-click any link on the web."
                >
                  <Button variant="primary" icon={<PlusIcon />} onClick={onAdd}>
                    Add torrent
                  </Button>
                </EmptyState>
              )
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const torrent = visible[item.index];
                  if (!torrent) return null;
                  return (
                    <div
                      key={torrent.id}
                      style={{ position: "absolute", inset: "0 0 auto 0", transform: `translateY(${item.start}px)` }}
                    >
                      <TorrentRow
                        torrent={torrent}
                        selected={selection.has(torrent.id)}
                        selecting={selection.count > 0}
                        current={torrent.id === detailId}
                        cursor={cursor === item.index}
                        actions={{
                          toggle: (event) => selection.toggle(torrent.id, item.index, event.shiftKey),
                          open: () => {
                            setCursor(item.index);
                            navigate(`/torrents/${torrent.id}`);
                          },
                          download: () => actions.torrents([torrent], "download"),
                          copy: () => actions.torrents([torrent], "copy"),
                          stream: () => actions.torrents([torrent], "stream"),
                          reinsert: () => reinsert(torrent),
                          chooseFiles: () => setPicking(torrent.id),
                          remove: () => removeMany([torrent], torrent.filename),
                        }}
                      />
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
            detail={formatBytes(selected.reduce((sum, t) => sum + t.bytes, 0))}
            onClear={selection.clear}
          >
            <Button
              size="sm"
              variant="ghost"
              icon={<DownloadSimpleIcon />}
              disabled={!readySelected.length}
              onClick={() => actions.torrents(readySelected, "download")}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<CopyIcon />}
              disabled={!readySelected.length}
              onClick={() => actions.torrents(readySelected, "copy")}
            >
              Copy links
            </Button>
            <Button size="sm" variant="ghost" icon={<ArrowClockwiseIcon />} onClick={() => reinsertMany(selected)}>
              Reinsert
            </Button>
            <Button size="sm" variant="danger" icon={<TrashIcon />} onClick={() => removeMany(selected, "")}>
              Delete
            </Button>
          </SelectionBar>
        )}
      </section>

      {detailId && (
        <TorrentDetail id={detailId} onChooseFiles={setPicking} onDelete={(t) => removeMany([t], t.filename)} />
      )}
      <FilePicker torrentId={picking} onClose={() => setPicking(null)} />
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function LoadingRows(): ReactNode {
  return (
    <div>
      {[62, 48, 71, 55, 66, 40, 58, 52].map((width, index) => (
        <div
          key={index}
          className="gutter flex items-center gap-3 border-b border-border"
          style={{ height: ROW_HEIGHT }}
        >
          <span className="w-5" />
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton style={{ width: `${width}%` }} />
          <Skeleton className="ml-auto w-16" />
        </div>
      ))}
    </div>
  );
}
