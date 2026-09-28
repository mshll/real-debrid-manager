import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownUp, Copy, Download, Eraser, Play, Plus, RotateCw, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Confirm, type ConfirmRequest } from "@/components/confirm";
import { FilePicker } from "@/components/file-picker";
import { Button, IconButton } from "@/components/ui/button";
import { Menu, type MenuAction } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { useActions } from "@/hooks/use-actions";
import { reinsertTorrent, useReinsert } from "@/hooks/use-torrent-mutations";
import { formatBytes, isActive, isFailed } from "@/lib/format";
import { keys, useLibrary } from "@/lib/queries";
import { deleteTorrent } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Torrent } from "@/lib/rd/types";

import { navigate } from "../router";
import { SearchField, SelectionBar, Toolbar } from "../toolbar";
import { useSelection } from "../use-selection";
import { duplicateTorrents, failedTorrents } from "./cleanup";
import { TorrentDetail } from "./detail";
import { ROW_HEIGHT, TorrentRow } from "./row";

type Filter = "all" | "active" | "ready" | "failed";
type Sort = "added" | "name" | "size";

const FILTERS: Record<Filter, (torrent: Torrent) => boolean> = {
  all: () => true,
  active: (t) => isActive(t.status),
  ready: (t) => t.status === "downloaded",
  failed: (t) => isFailed(t.status),
};

const SORTERS: Record<Sort, (a: Torrent, b: Torrent) => number> = {
  added: (a, b) => Date.parse(b.added) - Date.parse(a.added),
  name: (a, b) => a.filename.localeCompare(b.filename),
  size: (a, b) => b.bytes - a.bytes,
};

export function TorrentsView({ detailId, onAdd }: { detailId: string | null; onAdd: () => void }): ReactNode {
  const { torrents, isLoading, error } = useLibrary();
  const queryClient = useQueryClient();
  const actions = useActions();
  const reinsert = useReinsert();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("added");
  const [picking, setPicking] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const compact = Boolean(detailId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return torrents
      .filter(FILTERS[filter])
      .filter((t) => !needle || t.filename.toLowerCase().includes(needle) || t.hash === needle)
      .sort(SORTERS[sort]);
  }, [torrents, filter, query, sort]);
  const ids = useMemo(() => visible.map((t) => t.id), [visible]);
  const selection = useSelection(ids);
  const selected = visible.filter((t) => selection.has(t.id));

  const counts = useMemo(
    () => ({ active: torrents.filter(FILTERS.active).length, failed: torrents.filter(FILTERS.failed).length }),
    [torrents],
  );
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
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if ((event.metaKey || event.ctrlKey) && event.key === "a" && !typing) {
        event.preventDefault();
        selection.setAll(true);
      } else if (event.key === "Escape" && !typing) {
        if (selection.count) selection.clear();
        else if (detailId) navigate("/torrents");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, detailId]);

  const removeMany = (list: Torrent[], label: string): void => {
    setConfirm({
      title: `Delete ${list.length} torrent${list.length === 1 ? "" : "s"}?`,
      description: `${label} This can't be undone.`,
      action: "Delete",
      onConfirm: () => {
        const id = toast.loading(`Deleting ${list.length}`);
        (async () => {
          for (const torrent of list) await deleteTorrent(torrent.id);
          selection.clear();
          await queryClient.invalidateQueries({ queryKey: keys.torrents });
          toast.success(`Deleted ${list.length}`, { id });
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

  const rowMenu = (torrent: Torrent): (MenuAction | "separator")[] => {
    const ready = torrent.status === "downloaded" && torrent.links.length > 0;
    return [
      ...(ready
        ? [
            { label: "Download", icon: <Download />, onSelect: () => actions.download(torrent.links) },
            { label: "Stream", icon: <Play />, onSelect: () => torrent.links[0] && actions.stream(torrent.links[0]) },
            { label: "Copy links", icon: <Copy />, onSelect: () => actions.copy(torrent.links) },
            { label: "Send to aria2", icon: <Send />, onSelect: () => actions.aria2(torrent.links) },
            "separator" as const,
          ]
        : []),
      { label: "Copy magnet", icon: <Copy />, onSelect: () => copyText(`magnet:?xt=urn:btih:${torrent.hash}`) },
      { label: "Reinsert", icon: <RotateCw />, onSelect: () => reinsert(torrent) },
      "separator",
      { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => removeMany([torrent], torrent.filename) },
    ];
  };

  const readyLinks = selected.flatMap((t) => (t.status === "downloaded" ? t.links : []));

  return (
    <div className="flex min-w-0 flex-1">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar
          title="Torrents"
          subtitle={torrents.length && !compact ? `${visible.length} of ${torrents.length}` : undefined}
        >
          <Segmented
            value={filter}
            onChange={setFilter}
            className={compact ? "w-[236px] shrink-0" : "w-[300px] shrink-0"}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: counts.active && !compact ? `Active ${counts.active}` : "Active" },
              { value: "ready", label: "Ready" },
              { value: "failed", label: counts.failed && !compact ? `Failed ${counts.failed}` : "Failed" },
            ]}
          />
          <SearchField value={query} onChange={setQuery} inputRef={searchRef} placeholder="Search torrents" />
          <Menu
            trigger={
              compact ? (
                <IconButton label="Sort">
                  <ArrowDownUp />
                </IconButton>
              ) : (
                <Button variant="ghost" size="sm" icon={<ArrowDownUp className="size-3.5" />}>
                  {sort === "added" ? "Newest" : sort === "name" ? "Name" : "Size"}
                </Button>
              )
            }
            items={[
              { label: "Newest first", onSelect: () => setSort("added") },
              { label: "Name", onSelect: () => setSort("name") },
              { label: "Largest first", onSelect: () => setSort("size") },
            ]}
          />
          <Menu
            trigger={
              compact ? (
                <IconButton label="Clean up">
                  <Eraser />
                </IconButton>
              ) : (
                <Button variant="ghost" size="sm" icon={<Eraser className="size-3.5" />}>
                  Clean up
                </Button>
              )
            }
            items={[
              {
                label: `Remove failed (${failed.length})`,
                disabled: !failed.length,
                onSelect: () => removeMany(failed, "Failed, dead and errored torrents will be removed."),
              },
              {
                label: `Remove duplicates (${duplicates.length})`,
                disabled: !duplicates.length,
                onSelect: () => removeMany(duplicates, "The best copy of each torrent is kept."),
              },
              {
                label: `Reinsert failed (${failed.length})`,
                disabled: !failed.length,
                onSelect: () => reinsertMany(failed),
              },
            ]}
          />
          <Button variant="primary" size="sm" icon={<Plus className="size-3.5" />} onClick={onAdd}>
            Add
          </Button>
        </Toolbar>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-1.5">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-fg-3">
              <Spinner />
            </div>
          ) : error ? (
            <p className="p-10 text-center text-[13px] text-danger">{errorMessage(error)}</p>
          ) : !visible.length ? (
            <EmptyState filtered={Boolean(query) || filter !== "all"} onAdd={onAdd} />
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((item) => {
                const torrent = visible[item.index];
                if (!torrent) return null;
                return (
                  <div
                    key={torrent.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${item.start}px)`,
                    }}
                  >
                    <TorrentRow
                      torrent={torrent}
                      selected={selection.has(torrent.id)}
                      selecting={selection.count > 0}
                      current={torrent.id === detailId}
                      menu={rowMenu(torrent)}
                      onToggle={(event) => selection.toggle(torrent.id, item.index, event.shiftKey)}
                      onOpen={() => navigate(`/torrents/${torrent.id}`)}
                      onDownload={() => actions.download(torrent.links)}
                      onChooseFiles={() => setPicking(torrent.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
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
              icon={<Download className="size-3.5" />}
              disabled={!readyLinks.length}
              onClick={() => actions.download(readyLinks)}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Copy className="size-3.5" />}
              disabled={!readyLinks.length}
              onClick={() => actions.copy(readyLinks)}
            >
              Copy links
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCw className="size-3.5" />}
              onClick={() => reinsertMany(selected)}
            >
              Reinsert
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="size-3.5" />}
              onClick={() => removeMany(selected, "")}
            >
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

function EmptyState({ filtered, onAdd }: { filtered: boolean; onAdd: () => void }): ReactNode {
  if (filtered) return <p className="p-16 text-center text-[13px] text-fg-3">No torrents match.</p>;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-16 text-center">
      <p className="text-[14px] font-medium">Your library is empty</p>
      <p className="max-w-72 text-[12.5px] text-fg-2">
        Add a magnet, drop a .torrent file anywhere on this page, or right-click any link on the web.
      </p>
      <Button variant="primary" icon={<Plus className="size-4" />} onClick={onAdd}>
        Add torrent
      </Button>
    </div>
  );
}

function copyText(text: string): void {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("Copied"))
    .catch((error: unknown) => toast.error(errorMessage(error)));
}
