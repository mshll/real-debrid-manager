import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ScanSearch } from "lucide-react";
import { useState, type ReactNode } from "react";

import { FileIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/progress";
import type { AddOutcome } from "@/lib/add";
import { sendMessage } from "@/lib/messaging";
import { errorMessage } from "@/lib/rd/errors";
import { scanActiveTab } from "@/lib/scan";

import { summarize } from "@/components/composer";

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
        className="flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 text-[12.5px] text-fg-2 hover:bg-fill"
      >
        <ScanSearch className="size-4" /> Find links on this page
      </button>
    );
  }
  if (isFetching) {
    return (
      <div className="flex h-9 items-center gap-2 px-2.5 text-[12.5px] text-fg-3">
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
    <div className="overflow-hidden rounded-[10px] bg-accent-soft">
      <div className="flex h-10 items-center gap-2 pr-1.5 pl-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-[12.5px]"
          onClick={() => setOpen(!open)}
        >
          <ScanSearch className="size-4 shrink-0 text-accent" />
          <span className="truncate">
            <span className="font-medium">{summarize(scan.links)}</span> <span className="text-fg-2">on this page</span>
          </span>
          <ChevronRight
            className={`size-3.5 shrink-0 text-fg-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
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
        <div className="[&>*+*]:hairline-t max-h-56 overflow-y-auto bg-surface">
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
              className="flex h-9 w-full items-center gap-2.5 px-2.5 text-left hover:bg-fill"
            >
              <CheckMark checked={!excluded.has(link.url)} />
              <FileIcon
                name={link.name ?? ""}
                kind={link.kind === "magnet" ? "magnet" : link.kind === "folder" ? "folder" : undefined}
              />
              <span className="min-w-0 flex-1 truncate text-[12px]" title={link.url}>
                {link.name ?? link.url}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
