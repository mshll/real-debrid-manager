import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { clearPending, selectAndVerify } from "@/lib/add";
import { formatBytes } from "@/lib/format";
import { keys, useTorrent } from "@/lib/queries";
import { errorMessage } from "@/lib/rd/errors";
import { chooseFiles, fileName } from "@/lib/select";
import { pendingSelectionItem } from "@/lib/storage";

import { FileIcon } from "./file-icon";
import { Button } from "./ui/button";
import { CheckMark } from "./ui/checkbox";
import { Dialog } from "./ui/dialog";
import { Spinner } from "./ui/progress";

export function FilePicker({ torrentId, onClose }: { torrentId: string | null; onClose: () => void }): ReactNode {
  return (
    <Dialog
      open={Boolean(torrentId)}
      onOpenChange={(open) => !open && onClose()}
      title="Choose files"
      description="Pick what Real-Debrid should download. Suggested keeps the main videos."
      className="max-w-2xl"
    >
      {torrentId && <PickerBody torrentId={torrentId} onDone={onClose} />}
    </Dialog>
  );
}

function PickerBody({ torrentId, onDone }: { torrentId: string; onDone: () => void }): ReactNode {
  const queryClient = useQueryClient();
  const { data: torrent, isLoading } = useTorrent(torrentId);
  const [picked, setPicked] = useState<Set<number> | null>(null);
  const [saving, setSaving] = useState(false);

  const files = useMemo(() => torrent?.files ?? [], [torrent]);
  const root = useMemo(() => sharedRoot(files.map((file) => file.path)), [files]);
  const suggested = useMemo(() => {
    const choice = chooseFiles(files, "video");
    return new Set(choice === "all" ? files.map((file) => file.id) : choice);
  }, [files]);
  const selection = picked ?? suggested;
  const selectedBytes = files.filter((file) => selection.has(file.id)).reduce((sum, file) => sum + file.bytes, 0);

  const toggle = (id: number, checked: boolean): void => {
    const next = new Set(selection);
    if (checked) next.add(id);
    else next.delete(id);
    setPicked(next);
  };

  const start = async (): Promise<void> => {
    setSaving(true);
    try {
      const entry = (await pendingSelectionItem.getValue())[torrentId];
      const result = await selectAndVerify(torrentId, [...selection], entry?.onlyCached ?? false);
      await clearPending(torrentId);
      await queryClient.invalidateQueries({ queryKey: keys.torrents });
      await queryClient.invalidateQueries({ queryKey: keys.torrent(torrentId) });
      if (result === "not-cached") toast.error("Not cached, removed");
      else toast.success("Torrent started");
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !torrent) {
    return (
      <div className="flex justify-center py-12 text-fg-3">
        <Spinner />
      </div>
    );
  }

  if (torrent.status === "magnet_conversion") {
    return (
      <p className="py-10 text-center text-[13px] text-fg-3">Real-Debrid is still fetching this torrent's file list.</p>
    );
  }

  const allChecked = selection.size === files.length;
  const noneChecked = selection.size === 0;
  const preset = allChecked ? "all" : noneChecked ? "none" : sameSet(selection, suggested) ? "suggested" : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-[10px] bg-fill px-3 py-2.5">
        <FileIcon name={torrent.filename} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={torrent.filename}>
          {torrent.filename}
        </span>
        {torrent.original_bytes > 0 && (
          <span className="tabular shrink-0 text-[12px] text-fg-3">{formatBytes(torrent.original_bytes)}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {(
          [
            ["suggested", "Suggested", suggested],
            ["all", "All", new Set(files.map((file) => file.id))],
            ["none", "None", new Set<number>()],
          ] as const
        ).map(([key, label, set]) => (
          <Button
            key={key}
            size="sm"
            variant={preset === key ? "secondary" : "ghost"}
            onClick={() => setPicked(new Set(set))}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="max-h-[44vh] divide-y divide-border overflow-y-auto rounded-[10px] bg-surface shadow-panel">
        {files.map((file) => {
          const folder = folderOf(file.path.slice(root.length));
          return (
            <button
              key={file.id}
              type="button"
              role="checkbox"
              aria-checked={selection.has(file.id)}
              onClick={() => toggle(file.id, !selection.has(file.id))}
              className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-fill"
            >
              <CheckMark checked={selection.has(file.id)} />
              <FileIcon name={file.path} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]" title={file.path}>
                  {fileName(file.path)}
                </span>
                {folder && <span className="block truncate text-[12px] text-fg-3">{folder}</span>}
              </span>
              <span className="tabular shrink-0 text-[12px] text-fg-3">{formatBytes(file.bytes)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="tabular text-[13px] text-fg-3">
          <span className="font-medium text-fg">{selection.size}</span> of {files.length} files ·{" "}
          {formatBytes(selectedBytes)}
        </span>
        <Button className="ml-auto" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!selection.size || saving} onClick={() => start().catch(console.error)}>
          {saving ? <Spinner /> : "Start download"}
        </Button>
      </div>
    </div>
  );
}

function sameSet(a: Set<number>, b: Set<number>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** Multi-file torrents nest everything under one folder named like the torrent; hide it. */
function sharedRoot(paths: string[]): string {
  const [first] = paths;
  const match = first?.match(/^\/?[^/]+\//);
  if (!match || paths.length < 2) return "";
  return paths.every((path) => path.startsWith(match[0])) ? match[0] : "";
}

function folderOf(path: string): string {
  const parts = path.replace(/^\//, "").split("/");
  return parts.slice(0, -1).join(" / ");
}
