import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useState, type ReactNode } from "react";

import { summarize } from "@/components/composer";
import { FileIcon } from "@/components/file-icon";
import { Spinner } from "@/components/ui/progress";
import type { AddOutcome } from "@/lib/add";
import type { ParsedLink } from "@/lib/links";
import { sendMessage } from "@/lib/messaging";
import { errorMessage } from "@/lib/rd/errors";
import { scanActiveTab } from "@/lib/scan";

import { SectionHeader } from "./section-header";

const HEADER_BUTTON =
  "press -mr-2 inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12px] font-medium disabled:opacity-50";

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
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  if (!requested) {
    return (
      <SectionHeader title="On this page">
        <button
          type="button"
          onClick={() => setRequested(true)}
          className={clsx(HEADER_BUTTON, "text-fg-2 hover:bg-fill hover:text-fg")}
        >
          Find links
        </button>
      </SectionHeader>
    );
  }
  if (isFetching) {
    return (
      <SectionHeader title="On this page">
        <span className="flex items-center gap-1.5 text-[12px] text-fg-3">
          <Spinner className="size-3" /> Scanning page
        </span>
      </SectionHeader>
    );
  }
  if (!scan?.links.length) return null;

  const remaining = scan.links.filter((link) => !added.has(link.url));
  const add = async (links: ParsedLink[], key: string): Promise<void> => {
    setBusy(key);
    try {
      onResult(await sendMessage("addLinks", { links, options: { tabId: scan.tabId } }));
      setAdded(new Set([...added, ...links.map((link) => link.url)]));
    } catch (error) {
      onResult([{ ok: false, kind: "magnet", title: "Add failed", error: errorMessage(error) }]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="flex shrink-0 flex-col">
      <SectionHeader
        title={
          <>
            On this page <span className="text-fg-4">· {summarize(scan.links)}</span>
          </>
        }
      >
        {remaining.length > 1 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => add(remaining, "all").catch(console.error)}
            className={clsx(HEADER_BUTTON, "text-accent hover:bg-accent-soft")}
          >
            {busy === "all" ? <Spinner className="size-3" /> : <PlusIcon className="size-3" />}
            {remaining.length === scan.links.length ? "Add all" : `Add ${remaining.length}`}
          </button>
        )}
      </SectionHeader>
      <div className="scroll-fade max-h-[152px] overflow-y-auto px-2 pb-2">
        {scan.links.map((link) => {
          const done = added.has(link.url);
          return (
            <button
              key={link.url}
              type="button"
              disabled={done || busy !== null}
              onClick={() => add([link], link.url).catch(console.error)}
              className="group flex h-9 w-full items-center gap-3 rounded-[8px] px-2 text-left enabled:hover:bg-fill"
            >
              <FileIcon
                name={link.name ?? ""}
                kind={link.kind === "magnet" ? "magnet" : link.kind === "folder" ? "folder" : undefined}
              />
              <span className={clsx("min-w-0 flex-1 truncate text-[13px]", done && "text-fg-3")} title={link.url}>
                {link.name ?? label(link.url)}
              </span>
              <span className="flex size-6 shrink-0 items-center justify-center">
                {busy === link.url ? (
                  <Spinner className="size-3.5" />
                ) : done ? (
                  <CheckIcon className="size-3.5 text-accent" />
                ) : (
                  <PlusIcon className="size-3.5 text-fg-3 group-hover:text-fg" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function label(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}
