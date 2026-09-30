import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  GearSixIcon,
  PlusIcon,
  SidebarSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { browser } from "wxt/browser";

import { Composer } from "@/components/composer";
import { FilePicker } from "@/components/file-picker";
import { Logo } from "@/components/logo";
import { SignIn } from "@/components/sign-in";
import { IconButton } from "@/components/ui/button";
import { Skeleton, Spinner } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-settings";
import { useStorageItem } from "@/hooks/use-storage";
import type { AddOutcome } from "@/lib/add";
import { daysLeft, isActive } from "@/lib/format";
import { describeOutcomes } from "@/lib/outcome";
import { managerUrl } from "@/lib/pages";
import { keys, useRecentTorrents, useUser } from "@/lib/queries";
import type { Unrestricted } from "@/lib/rd/types";
import { authItem } from "@/lib/storage";

import { PageLinks, usePageLinks, type PageLinksState } from "./page-links";
import { RecentDownloads } from "./recent-downloads";
import { RecentTorrents } from "./recent-torrents";

/** The popup and the side panel run the same app; the panel fills its frame and stays open. */
export type Surface = "popup" | "panel";

const FRAME: Record<Surface, string> = { popup: "h-[560px] w-[400px]", panel: "h-screen w-full" };
const CAN_OPEN_PANEL = import.meta.env.BROWSER === "chrome" && "sidePanel" in browser;

export function PopupApp({ surface = "popup" }: { surface?: Surface }): ReactNode {
  const auth = useStorageItem(authItem);
  return (
    <div className={FRAME[surface]}>{auth === undefined ? null : auth ? <Home surface={surface} /> : <SignIn />}</div>
  );
}

type Tab = "torrents" | "downloads" | "page";

function Home({ surface }: { surface: Surface }): ReactNode {
  const openManager = (route = "/"): void => {
    browser.tabs.create({ url: managerUrl(route) }).catch(console.error);
    if (surface === "popup") window.close();
  };
  const windowId = useCurrentWindowId();
  const openPanel = (): void => {
    if (windowId === null) return;
    // sidePanel.open needs the click's user gesture, so no await may come before it.
    browser.sidePanel
      .open({ windowId })
      .then(() => window.close())
      .catch(console.error);
  };

  const [settings] = useSettings();
  const { data: user } = useUser();
  const { data: recent } = useRecentTorrents(30);
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Tab | null>(null);
  const [fresh, setFresh] = useState<Unrestricted[]>([]);
  const [picking, setPicking] = useState<string | null>(null);

  const handleResult = (next: AddOutcome[], from: "composer" | "page"): void => {
    const notable = next.filter(
      (outcome) => !outcome.ok || outcome.status === "duplicate" || outcome.status === "not-cached",
    );
    if (notable.length) {
      const summary = describeOutcomes(notable);
      if (summary.ok) toast(summary.title, { description: summary.message });
      else toast.error(summary.title, { description: summary.message });
    }

    const unlocked = next.flatMap((outcome) => (outcome.ok ? (outcome.downloads ?? []) : []));
    if (unlocked.length) {
      const ids = new Set(unlocked.map((item) => item.id));
      setFresh((current) => [...unlocked, ...current.filter((item) => !ids.has(item.id))]);
      queryClient.invalidateQueries({ queryKey: keys.downloads }).catch(console.error);
    }
    if (next.some((outcome) => outcome.ok && (outcome.kind === "magnet" || outcome.kind === "torrent"))) {
      queryClient.invalidateQueries({ queryKey: keys.torrents }).catch(console.error);
    }
    if (from === "composer") setChosen(unlocked.length ? "downloads" : "torrents");

    const needsFiles = next.find((outcome) => outcome.ok && outcome.status === "choose-files");
    if (needsFiles?.ok && needsFiles.torrentId && next.length === 1) setPicking(needsFiles.torrentId);
  };
  const page = usePageLinks(settings.scanOnOpen, surface === "panel", (next) => handleResult(next, "page"));
  // Until a tab is picked, open where the work is: the page's links when it has any.
  const tab = chosen ?? (page.links?.length ? "page" : "torrents");

  const days = user ? daysLeft(user.premium) : null;
  const low = days !== null && days <= settings.expiryReminderDays;
  const active = recent?.filter((torrent) => isActive(torrent.status)).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 px-3">
        <Tooltip label="Open manager">
          <button
            type="button"
            onClick={() => openManager()}
            className="press flex h-9 min-w-0 items-center gap-2.5 rounded-[8px] px-1.5 hover:bg-fill"
          >
            <Logo className="size-6 shrink-0" />
            {user ? (
              <span className="truncate text-[14px] font-semibold tracking-[-0.01em]">{user.username}</span>
            ) : (
              <Skeleton className="h-3.5 w-24" />
            )}
          </button>
        </Tooltip>
        {user && (
          <button
            type="button"
            onClick={() => openManager("/account")}
            className={clsx(
              "press tabular inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[12px] font-medium",
              user.type !== "premium" || low
                ? "bg-warning-soft text-warning"
                : "bg-fill text-fg-2 hover:bg-fill-strong hover:text-fg",
            )}
          >
            {user.type === "premium" ? `${days} days left` : "Free account"}
          </button>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {surface === "popup" && CAN_OPEN_PANEL && (
            <IconButton label="Open in side panel" onClick={openPanel}>
              <SidebarSimpleIcon />
            </IconButton>
          )}
          <IconButton label="Open manager" onClick={() => openManager()}>
            <ArrowSquareOutIcon />
          </IconButton>
          <IconButton label="Settings" onClick={() => openManager("/settings")}>
            <GearSixIcon />
          </IconButton>
        </div>
      </header>

      <div className="shrink-0 px-3">
        <Composer compact onResult={(next) => handleResult(next, "composer")} />
      </div>

      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Tabs
          value={tab}
          onChange={(next) => {
            setChosen(next);
            if (next === "page") page.request();
          }}
          options={[
            { value: "torrents", label: "Torrents", count: active },
            { value: "downloads", label: "Downloads", count: fresh.length },
            { value: "page", label: "On page", count: page.links?.length },
          ]}
        />
        <span className="ml-auto flex items-center">
          {tab === "torrents" && (
            <HeaderLink onClick={() => openManager("/torrents")}>
              View all <ArrowRightIcon className="size-3" />
            </HeaderLink>
          )}
          {tab === "downloads" && (
            <HeaderLink onClick={() => openManager("/downloads")}>
              View all <ArrowRightIcon className="size-3" />
            </HeaderLink>
          )}
          {tab === "page" && <PageAction page={page} />}
        </span>
      </div>

      <div className="scroll-fade min-h-0 flex-1 overflow-y-auto p-1.5">
        <div hidden={tab !== "torrents"}>
          <RecentTorrents onOpen={openManager} onChooseFiles={setPicking} />
        </div>
        <div hidden={tab !== "downloads"}>
          <RecentDownloads fresh={fresh} />
        </div>
        <div hidden={tab !== "page"}>
          <PageLinks state={page} />
        </div>
      </div>

      <FilePicker torrentId={picking} onClose={() => setPicking(null)} />
    </div>
  );
}

function HeaderLink({
  accent,
  disabled,
  onClick,
  children,
}: {
  accent?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactNode {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "press inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12px] font-medium whitespace-nowrap disabled:opacity-50",
        accent ? "text-accent hover:bg-accent-soft" : "text-fg-2 hover:bg-fill hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function PageAction({ page }: { page: PageLinksState }): ReactNode {
  const busy = page.busy !== null;
  if (page.selected.size) {
    const picked = page.remaining.filter((link) => page.selected.has(link.url));
    return (
      <>
        <IconButton size="sm" label="Clear selection" onClick={page.clearSelection}>
          <XIcon />
        </IconButton>
        <HeaderLink accent disabled={busy} onClick={() => page.add(picked, "selected")}>
          {page.busy === "selected" ? <Spinner className="size-3" /> : <PlusIcon className="size-3.5" />}
          Add {picked.length}
        </HeaderLink>
      </>
    );
  }
  if (page.remaining.length < 2) return null;
  const everything = !page.filter && page.remaining.length === page.links?.length;
  return (
    <HeaderLink accent disabled={busy} onClick={() => page.add(page.remaining, "all")}>
      {page.busy === "all" ? <Spinner className="size-3" /> : <PlusIcon className="size-3.5" />}
      {everything ? "Add all" : `Add ${page.remaining.length}`}
    </HeaderLink>
  );
}

function useCurrentWindowId(): number | null {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    browser.windows
      .getCurrent()
      .then((current) => setId(current.id ?? null))
      .catch(console.error);
  }, []);
  return id;
}
