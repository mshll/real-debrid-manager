import { CheckIcon, PlusIcon, ScanIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { FileIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import type { AddOutcome } from "@/lib/add";
import type { ParsedLink } from "@/lib/links";
import { sendMessage } from "@/lib/messaging";
import { errorMessage } from "@/lib/rd/errors";
import { scanActiveTab } from "@/lib/scan";

import { ListEmpty, ListSkeleton } from "./list-states";
import { PopupRow } from "./row";

export interface PageLinksState {
  requested: boolean;
  request: () => void;
  scanning: boolean;
  links: ParsedLink[] | null;
  added: Set<string>;
  busy: string | null;
  remaining: ParsedLink[];
  add: (links: ParsedLink[], key: string) => void;
}

/** Lives in the popup root so added marks and the scan survive tab switches. */
export function usePageLinks(enabled: boolean, onResult: (outcomes: AddOutcome[]) => void): PageLinksState {
  const [requested, setRequested] = useState(enabled);
  const { data: scan, isFetching } = useQuery({
    queryKey: ["scan"],
    queryFn: scanActiveTab,
    enabled: requested,
    staleTime: Infinity,
  });
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const links = scan?.links ?? null;

  const add = async (batch: ParsedLink[], key: string): Promise<void> => {
    if (!scan) return;
    setBusy(key);
    try {
      onResult(await sendMessage("addLinks", { links: batch, options: { tabId: scan.tabId } }));
      setAdded((current) => new Set([...current, ...batch.map((link) => link.url)]));
    } catch (error) {
      onResult([{ ok: false, kind: "magnet", title: "Add failed", error: errorMessage(error) }]);
    } finally {
      setBusy(null);
    }
  };

  return {
    requested,
    request: () => setRequested(true),
    scanning: isFetching,
    links,
    added,
    busy,
    remaining: links?.filter((link) => !added.has(link.url)) ?? [],
    add: (batch, key) => add(batch, key).catch(console.error),
  };
}

export function PageLinks({ state }: { state: PageLinksState }): ReactNode {
  if (!state.requested) {
    return (
      <ListEmpty icon={<ScanIcon />} title="Find links on this page" description="Magnets and supported hoster links.">
        <Button size="sm" onClick={state.request}>
          Scan page
        </Button>
      </ListEmpty>
    );
  }
  if (state.scanning) return <ListSkeleton />;
  if (!state.links?.length) {
    return (
      <ListEmpty
        icon={<ScanIcon />}
        title="Nothing to add here"
        description="No magnets or supported hoster links on this page."
      />
    );
  }
  return (
    <div className="flex flex-col">
      {state.links.map((link) => {
        const done = state.added.has(link.url);
        return (
          <PopupRow
            key={link.url}
            icon={
              <FileIcon
                name={link.name ?? ""}
                kind={link.kind === "magnet" ? "magnet" : link.kind === "folder" ? "folder" : undefined}
              />
            }
            title={link.name ?? label(link.url)}
            muted={done}
            disabled={done || state.busy !== null}
            onClick={() => state.add([link], link.url)}
            meta={
              state.busy === link.url ? (
                <Spinner className="size-3.5" />
              ) : done ? (
                <CheckIcon className="size-3.5 text-accent" />
              ) : (
                <PlusIcon className="size-3.5 text-fg-4 group-hover:text-fg" />
              )
            }
          />
        );
      })}
    </div>
  );
}

function label(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}
