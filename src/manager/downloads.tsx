import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { Copy, Download, MoreHorizontal, Play, Send, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Confirm, type ConfirmRequest } from "@/components/confirm";
import { FileIcon } from "@/components/file-icon";
import { Button, IconButton } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Menu } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/progress";
import { useActions } from "@/hooks/use-actions";
import { formatBytes, formatRelative } from "@/lib/format";
import { keys, useDownloads } from "@/lib/queries";
import { deleteDownload } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import type { Download as DownloadItem } from "@/lib/rd/types";

import { SearchField, SelectionBar, Toolbar } from "./toolbar";
import { useSelection } from "./use-selection";

const ROW = 48;

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

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <Toolbar title="Downloads" subtitle={downloads.length ? `${visible.length} of ${downloads.length}` : undefined}>
        <SearchField value={query} onChange={setQuery} placeholder="Search downloads" />
      </Toolbar>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-fg-3">
            <Spinner />
          </div>
        ) : error ? (
          <p className="p-10 text-center text-[13px] text-danger">{errorMessage(error)}</p>
        ) : !visible.length ? (
          <p className="p-16 text-center text-[13px] text-fg-3">
            {query ? "No downloads match." : "Links you unrestrict show up here."}
          </p>
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
                    className={clsx(
                      "group mx-2 flex items-center gap-3 rounded-[9px] px-3",
                      isSelected ? "bg-accent-soft" : "hover:bg-fill",
                    )}
                    style={{ height: ROW - 2 }}
                    onClick={(event) => selection.count > 0 && selection.toggle(item.id, row.index, event.shiftKey)}
                  >
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
                        "-m-1.5 flex p-1.5",
                        selection.count || isSelected ? "" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <CheckMark checked={isSelected} />
                    </button>
                    <FileIcon name={item.filename} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]" title={item.filename}>
                        {item.filename}
                      </div>
                      <div className="tabular truncate text-[11.5px] text-fg-2">
                        {item.host} · {formatBytes(item.filesize)} · {formatRelative(item.generated)}
                      </div>
                    </div>
                    <div
                      className="flex shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {item.streamable === 1 && (
                        <IconButton label="Stream" onClick={() => actions.stream(item.download, item.id)}>
                          <Play />
                        </IconButton>
                      )}
                      <IconButton label="Download" onClick={() => actions.download([item.download])}>
                        <Download />
                      </IconButton>
                      <Menu
                        trigger={
                          <IconButton label="More">
                            <MoreHorizontal />
                          </IconButton>
                        }
                        items={[
                          { label: "Copy link", icon: <Copy />, onSelect: () => actions.copy([item.download]) },
                          { label: "Send to aria2", icon: <Send />, onSelect: () => actions.aria2([item.download]) },
                          "separator",
                          { label: "Remove", icon: <Trash2 />, danger: true, onSelect: () => remove([item]) },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            icon={<Download className="size-3.5" />}
            onClick={() => actions.download(selected.map((d) => d.download))}
          >
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Copy className="size-3.5" />}
            onClick={() => actions.copy(selected.map((d) => d.download))}
          >
            Copy links
          </Button>
          <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => remove(selected)}>
            Remove
          </Button>
        </SelectionBar>
      )}
      <Confirm request={confirm} onClose={() => setConfirm(null)} />
    </section>
  );
}
