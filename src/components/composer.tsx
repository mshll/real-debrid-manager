import { ClipboardTextIcon, PaperclipIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useRef, useState, type ReactNode } from "react";
import { browser } from "wxt/browser";

import { Button, IconButton, Kbd } from "@/components/ui/button";
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

/** `compact` is the popup's one-line field: it grows with pasted lines and swaps its tools for Add. */
export function Composer({
  onResult,
  compact = false,
}: {
  onResult: (outcomes: AddOutcome[]) => void;
  compact?: boolean;
}): ReactNode {
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

  const tools = (
    <>
      <IconButton label="Paste from clipboard" onClick={() => paste().catch(console.error)}>
        <ClipboardTextIcon />
      </IconButton>
      <IconButton label="Upload .torrent files" onClick={() => fileInput.current?.click()}>
        <PaperclipIcon />
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
    </>
  );
  const addButton = (label: ReactNode): ReactNode => (
    <Button
      variant="primary"
      size="sm"
      className="min-w-16"
      disabled={!links.length || busy}
      onClick={() => submit().catch(console.error)}
    >
      {busy ? <Spinner className="size-3.5" /> : label}
    </Button>
  );
  const lines = text.split("\n").length;

  return (
    <div
      className={clsx(
        "relative flex rounded-[12px] bg-surface shadow-panel transition-shadow duration-150 focus-within:shadow-[0_0_0_1px_var(--border-strong)]",
        compact ? "items-end" : "flex-col",
        dragging && "shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]",
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
        rows={compact ? Math.min(4, lines) : text.includes("\n") ? 5 : 3}
        value={text}
        placeholder={dragging ? "Drop .torrent files" : "Paste magnets, hashes or hoster links"}
        className={clsx(
          "bg-transparent! text-[14px] shadow-none!",
          compact ? "min-w-0 flex-1 py-2.5 pr-1 pl-3.5" : "px-3.5 pt-3",
        )}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit().catch(console.error);
          }
        }}
      />
      {compact ? (
        <div className="flex h-11 shrink-0 items-center gap-0.5 pr-1.5">
          {text.trim()
            ? addButton(links.length > 1 ? `Add ${links.length}` : links.length ? "Add" : "No links")
            : tools}
        </div>
      ) : (
        <div className="flex items-center gap-0.5 px-2 pb-2">
          {tools}
          <span className={clsx("ml-1.5 truncate text-[12px]", links.length ? "font-medium text-fg-2" : "text-fg-3")}>
            {dragging
              ? "Drop .torrent files"
              : links.length
                ? summarize(links)
                : text.trim()
                  ? "No supported links"
                  : ""}
          </span>
          <span className="ml-auto">
            {addButton(
              <>
                Add <Kbd className="h-4 min-w-4 bg-black/10 text-[10px] text-current">⏎</Kbd>
              </>,
            )}
          </span>
        </div>
      )}
    </div>
  );
}
