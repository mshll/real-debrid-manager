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
      className="max-w-xl"
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
      <div className="flex justify-center py-10 text-fg-3">
        <Spinner />
      </div>
    );
  }

  if (torrent.status === "magnet_conversion") {
    return (
      <p className="py-8 text-center text-[13px] text-fg-2">Real-Debrid is still fetching this torrent's file list.</p>
    );
  }

  const allChecked = selection.size === files.length;

  return (
    <div className="flex flex-col gap-3">
      <p className="truncate text-[12.5px] text-fg-2" title={torrent.filename}>
        {torrent.filename}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant={allChecked ? "secondary" : "ghost"}
          onClick={() => setPicked(new Set(files.map((file) => file.id)))}
        >
          All
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPicked(new Set(suggested))}>
          Suggested
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
          None
        </Button>
        <span className="tabular ml-auto text-[12px] text-fg-2">
          {selection.size} of {files.length} · {formatBytes(selectedBytes)}
        </span>
      </div>
      <div className="[&>*+*]:hairline-t max-h-[50vh] overflow-y-auto rounded-[10px] bg-surface shadow-card">
        {files.map((file) => (
          <button
            key={file.id}
            type="button"
            role="checkbox"
            aria-checked={selection.has(file.id)}
            onClick={() => toggle(file.id, !selection.has(file.id))}
            className="flex h-10 w-full items-center gap-3 px-3 text-left hover:bg-fill"
          >
            <CheckMark checked={selection.has(file.id)} />
            <FileIcon name={file.path} />
            <span className="min-w-0 flex-1 truncate text-[13px]" title={file.path}>
              {fileName(file.path)}
            </span>
            <span className="tabular text-[12px] text-fg-3">{formatBytes(file.bytes)}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="primary" disabled={!selection.size || saving} onClick={() => start().catch(console.error)}>
          {saving ? <Spinner /> : "Start download"}
        </Button>
      </div>
    </div>
  );
}
