import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ClipboardPaste, Paperclip } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { browser } from "wxt/browser";

import { Button, IconButton } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/progress";
import type { AddOutcome } from "@/lib/add";
import { getHostMatchers } from "@/lib/hosts";
import { extractLinks, type ParsedLink } from "@/lib/links";
import { sendMessage } from "@/lib/messaging";
import { addTorrentFile } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";

export function summarize(links: ParsedLink[]): string {
  const magnets = links.filter((link) => link.kind === "magnet" || link.kind === "torrent").length;
  const others = links.length - magnets;
  const parts = [];
  if (magnets) parts.push(`${magnets} torrent${magnets === 1 ? "" : "s"}`);
  if (others) parts.push(`${others} link${others === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function Composer({ onResult }: { onResult: (outcomes: AddOutcome[]) => void }): ReactNode {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: matchers = null } = useQuery({
    queryKey: ["hostMatchers"],
    queryFn: getHostMatchers,
    staleTime: Infinity,
  });

  const links = text.trim() ? extractLinks(text, matchers, { bareHashes: true }) : [];

  const submit = async (): Promise<void> => {
    if (!links.length || busy) return;
    setBusy(true);
    try {
      onResult(await sendMessage("addLinks", { links }));
      setText("");
    } catch (error) {
      onResult([{ ok: false, kind: "magnet", title: "Add failed", error: errorMessage(error) }]);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (files: FileList | File[]): Promise<void> => {
    const torrents = [...files].filter((file) => file.name.toLowerCase().endsWith(".torrent"));
    if (!torrents.length) return;
    setBusy(true);
    const outcomes: AddOutcome[] = [];
    for (const file of torrents) {
      try {
        const added = await addTorrentFile(file);
        outcomes.push(await sendMessage("startUploadedTorrent", { id: added.id, name: file.name }));
      } catch (error) {
        outcomes.push({ ok: false, kind: "torrent", title: file.name, error: errorMessage(error) });
      }
    }
    onResult(outcomes);
    setBusy(false);
  };

  const paste = async (): Promise<void> => {
    try {
      if (browser.permissions && !(await browser.permissions.request({ permissions: ["clipboardRead"] }))) return;
      const clip = await navigator.clipboard.readText();
      setText((current) => (current ? `${current}\n${clip}` : clip));
    } catch (error) {
      console.info("Clipboard read blocked", error);
    }
  };

  return (
    <div
      className={clsx(
        "relative rounded-[12px] bg-fill transition-shadow",
        dragging && "shadow-[0_0_0_2px_var(--accent)]",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        upload(event.dataTransfer.files).catch(console.error);
      }}
    >
      <TextArea
        autoFocus
        rows={text.includes("\n") ? 4 : 2}
        value={text}
        placeholder="Paste magnets, hashes or hoster links"
        className="bg-transparent! px-3 pt-2.5 shadow-none!"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit().catch(console.error);
          }
        }}
      />
      <div className="flex items-center gap-1 px-1.5 pb-1.5">
        <IconButton label="Paste" onClick={() => paste().catch(console.error)}>
          <ClipboardPaste />
        </IconButton>
        <IconButton label="Upload .torrent" onClick={() => fileInput.current?.click()}>
          <Paperclip />
        </IconButton>
        <input
          ref={fileInput}
          type="file"
          accept=".torrent"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) upload(event.target.files).catch(console.error);
            event.target.value = "";
          }}
        />
        <span className="ml-1 truncate text-[11.5px] text-fg-3">
          {dragging ? "Drop .torrent files" : links.length ? summarize(links) : text.trim() ? "No supported links" : ""}
        </span>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto min-w-14"
          disabled={!links.length || busy}
          onClick={() => submit().catch(console.error)}
        >
          {busy ? <Spinner className="size-3.5" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}
