import { CaretRightIcon, ScanIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useState, type ReactNode } from "react";

import { summarize } from "@/components/composer";
import { FileIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/progress";
import type { AddOutcome } from "@/lib/add";
import { sendMessage } from "@/lib/messaging";
import { errorMessage } from "@/lib/rd/errors";
import { scanActiveTab } from "@/lib/scan";

export function PageLinks({
  enabled,
  onResult,
}: {
  enabled: boolean;
  onResult: (outcomes: AddOutcome[]) => void;
}): ReactNode {
  const [requested, setRequested] = useState(enabled);
  const { data: scan, isFetching } = useQuery({
    queryKey: ["scan"],
    queryFn: scanActiveTab,
    enabled: requested,
    staleTime: Infinity,
  });
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  if (!requested) {
    return (
      <button
        type="button"
        onClick={() => setRequested(true)}
        className="press flex h-9 w-full items-center gap-2 rounded-[8px] px-2.5 text-[13px] text-fg-2 hover:bg-fill hover:text-fg"
      >
        <ScanIcon className="size-4 text-fg-3" /> Find links on this page
      </button>
    );
  }
  if (isFetching) {
    return (
      <div className="flex h-9 items-center gap-2 px-2.5 text-[13px] text-fg-3">
        <Spinner className="size-3.5" /> Scanning page
      </div>
    );
  }
  if (!scan?.links.length) return null;

  const selected = scan.links.filter((link) => !excluded.has(link.url));
  const add = async (): Promise<void> => {
    setBusy(true);
    try {
      onResult(await sendMessage("addLinks", { links: selected, options: { tabId: scan.tabId } }));
      setOpen(false);
    } catch (error) {
      onResult([{ ok: false, kind: "magnet", title: "Add failed", error: errorMessage(error) }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[10px] bg-surface shadow-panel">
      <div className="flex h-12 items-center gap-2 pr-2 pl-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-[13px]"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft text-accent">
            <ScanIcon className="size-4" />
          </span>
          <span className="truncate">
            <span className="font-medium">{summarize(scan.links)}</span> <span className="text-fg-3">on this page</span>
          </span>
          <CaretRightIcon
            className={clsx("size-3 shrink-0 text-fg-3 transition-transform duration-200", open && "rotate-90")}
          />
        </button>
        <Button
          variant="primary"
          size="sm"
          disabled={!selected.length || busy}
          onClick={() => add().catch(console.error)}
        >
          {busy ? (
            <Spinner className="size-3.5" />
          ) : selected.length === scan.links.length ? (
            "Add all"
          ) : (
            `Add ${selected.length}`
          )}
        </Button>
      </div>
      {open && (
        <div className="max-h-56 divide-y divide-border overflow-y-auto border-t border-border">
          {scan.links.map((link) => (
            <button
              key={link.url}
              type="button"
              role="checkbox"
              aria-checked={!excluded.has(link.url)}
              onClick={() => {
                const next = new Set(excluded);
                if (next.has(link.url)) next.delete(link.url);
                else next.add(link.url);
                setExcluded(next);
              }}
              className="flex h-10 w-full items-center gap-3 px-3 text-left hover:bg-fill"
            >
              <CheckMark checked={!excluded.has(link.url)} />
              <FileIcon
                name={link.name ?? ""}
                kind={link.kind === "magnet" ? "magnet" : link.kind === "folder" ? "folder" : undefined}
              />
              <span className="min-w-0 flex-1 truncate text-[13px]" title={link.url}>
                {link.name ?? link.url}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
