import { CheckIcon, LockKeyIcon, MagnifyingGlassIcon, PlusIcon, ScanIcon, XIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { browser } from "wxt/browser";

import { FileIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import type { AddOutcome } from "@/lib/add";
import type { ParsedLink } from "@/lib/links";
import { sendMessage } from "@/lib/messaging";
import { errorMessage } from "@/lib/rd/errors";
import { scanActiveTab, type PageScan } from "@/lib/scan";

import { ListEmpty, ListSkeleton } from "./list-states";
import { PopupRow } from "./row";

const SCAN_KEY = ["scan"];
const FILTER_FROM = 8;

interface PageStore {
  key: string;
  added: Set<string>;
  selected: Set<string>;
  filter: string;
}

export interface PageLinksState {
  requested: boolean;
  request: () => void;
  scanning: boolean;
  scan: PageScan | undefined;
  links: ParsedLink[] | null;
  visible: ParsedLink[];
  remaining: ParsedLink[];
  filter: string;
  setFilter: (filter: string) => void;
  added: Set<string>;
  selected: Set<string>;
  toggle: (link: ParsedLink, event: MouseEvent) => void;
  clearSelection: () => void;
  busy: string | null;
  add: (links: ParsedLink[], key: string) => void;
  grant: () => void;
}

/**
 * Lives in the surface root so added marks, the filter and the selection survive tab switches.
 * `follow` rescans when the active tab changes, for the side panel, which outlives any one page.
 */
export function usePageLinks(
  enabled: boolean,
  follow: boolean,
  onResult: (outcomes: AddOutcome[]) => void,
): PageLinksState {
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState(enabled);
  const { data: scan, isFetching } = useQuery({
    queryKey: SCAN_KEY,
    queryFn: scanActiveTab,
    enabled: requested,
    staleTime: Infinity,
  });
  const key = scan?.status === "ok" ? `${scan.tabId}:${scan.url}` : "";
  const [store, setStore] = useState<PageStore>(() => emptyStore(""));
  const current = store.key === key ? store : emptyStore(key);
  const update = (patch: (base: PageStore) => Partial<Omit<PageStore, "key">>): void =>
    setStore((previous) => {
      const base = previous.key === key ? previous : emptyStore(key);
      return { ...base, ...patch(base) };
    });
  const [busy, setBusy] = useState<string | null>(null);
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    if (!follow) return;
    const rescan = (): void => {
      queryClient.resetQueries({ queryKey: SCAN_KEY }).catch(console.error);
    };
    const onUpdated = (_id: number, change: { status?: string }, tab: { active: boolean }): void => {
      if (tab.active && change.status === "complete") rescan();
    };
    browser.tabs.onActivated.addListener(rescan);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.windows.onFocusChanged.addListener(rescan);
    return () => {
      browser.tabs.onActivated.removeListener(rescan);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.windows.onFocusChanged.removeListener(rescan);
    };
  }, [follow, queryClient]);

  const links = scan?.status === "ok" ? scan.links : null;
  const needle = current.filter.trim().toLowerCase();
  const visible = needle
    ? (links ?? []).filter((link) => `${link.name ?? ""} ${link.url}`.toLowerCase().includes(needle))
    : (links ?? []);

  const add = async (batch: ParsedLink[], busyKey: string): Promise<void> => {
    if (scan?.status !== "ok") return;
    setBusy(busyKey);
    try {
      onResult(await sendMessage("addLinks", { links: batch, options: { tabId: scan.tabId } }));
      const urls = batch.map((link) => link.url);
      update((base) => ({
        added: new Set([...base.added, ...urls]),
        selected: new Set([...base.selected].filter((url) => !urls.includes(url))),
      }));
    } catch (error) {
      onResult([{ ok: false, kind: "magnet", title: "Add failed", error: errorMessage(error) }]);
    } finally {
      setBusy(null);
    }
  };

  const toggle = (link: ParsedLink, event: MouseEvent): void => {
    const index = visible.indexOf(link);
    const next = new Set(current.selected);
    const on = !next.has(link.url);
    const from = event.shiftKey && anchor.current !== null ? Math.min(anchor.current, index) : index;
    const to = event.shiftKey && anchor.current !== null ? Math.max(anchor.current, index) : index;
    for (const item of visible.slice(from, to + 1)) {
      if (current.added.has(item.url)) continue;
      if (on) next.add(item.url);
      else next.delete(item.url);
    }
    anchor.current = index;
    update(() => ({ selected: next }));
  };

  const grant = (): void => {
    if (scan?.status !== "no-access") return;
    browser.permissions
      .request({ origins: [scan.origin] })
      .then((granted) => (granted ? queryClient.resetQueries({ queryKey: SCAN_KEY }) : undefined))
      .catch(console.error);
  };

  return {
    requested,
    request: () => setRequested(true),
    scanning: isFetching,
    scan,
    links,
    visible,
    remaining: visible.filter((link) => !current.added.has(link.url)),
    filter: current.filter,
    setFilter: (filter) => update(() => ({ filter, selected: new Set() })),
    added: current.added,
    selected: current.selected,
    toggle,
    clearSelection: () => update(() => ({ selected: new Set() })),
    busy,
    add: (batch, busyKey) => add(batch, busyKey).catch(console.error),
    grant,
  };
}

function emptyStore(key: string): PageStore {
  return { key, added: new Set(), selected: new Set(), filter: "" };
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
  if (state.scanning && !state.scan) return <ListSkeleton />;
  if (state.scan?.status === "no-access") {
    return (
      <ListEmpty
        icon={<LockKeyIcon />}
        title={`Allow access to ${state.scan.host}`}
        description="The side panel needs your permission to read links on this site."
      >
        <Button size="sm" variant="primary" onClick={state.grant}>
          Allow on {state.scan.host}
        </Button>
      </ListEmpty>
    );
  }
  if (!state.links?.length) {
    return (
      <ListEmpty
        icon={<ScanIcon />}
        title="Nothing to add here"
        description={
          state.scan?.status === "restricted"
            ? "Browser pages can't be scanned."
            : "No magnets or supported hoster links on this page."
        }
      />
    );
  }

  const selecting = state.selected.size > 0;
  return (
    <div className="flex flex-col">
      {state.links.length > FILTER_FROM && <FilterField state={state} />}
      {state.visible.map((link) => {
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
            select={
              done
                ? undefined
                : {
                    checked: state.selected.has(link.url),
                    selecting,
                    onToggle: (event) => state.toggle(link, event),
                  }
            }
            onClick={(event) =>
              selecting || event.shiftKey || event.metaKey ? state.toggle(link, event) : state.add([link], link.url)
            }
            meta={
              state.busy === link.url || (state.busy === "selected" && state.selected.has(link.url)) ? (
                <Spinner className="size-3.5" />
              ) : done ? (
                <CheckIcon className="size-3.5 text-accent" />
              ) : selecting ? null : (
                <PlusIcon className="size-3.5 text-fg-4 group-hover:text-fg" />
              )
            }
          />
        );
      })}
      {state.visible.length === 0 && (
        <p className="px-2 py-8 text-center text-[12px] text-fg-3">No links match "{state.filter}"</p>
      )}
    </div>
  );
}

function FilterField({ state }: { state: PageLinksState }): ReactNode {
  return (
    <label className="mb-1 flex h-8 items-center gap-2 rounded-[8px] bg-fill px-2.5 text-fg-3 focus-within:text-fg-2">
      <MagnifyingGlassIcon className="size-3.5 shrink-0" />
      <input
        value={state.filter}
        onChange={(event) => state.setFilter(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && state.filter) {
            event.preventDefault();
            state.setFilter("");
          }
        }}
        placeholder={`Filter ${state.links?.length ?? 0} links`}
        aria-label="Filter links"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3"
      />
      {state.filter && (
        <button type="button" aria-label="Clear filter" onClick={() => state.setFilter("")} className="hover:text-fg">
          <XIcon className="size-3.5" />
        </button>
      )}
    </label>
  );
}

function label(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}
