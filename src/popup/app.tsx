import { ArrowRightIcon, GearSixIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { browser } from "wxt/browser";

import { Composer } from "@/components/composer";
import { FilePicker } from "@/components/file-picker";
import { Logo } from "@/components/logo";
import { mergeOutcomes, OutcomeList } from "@/components/outcome-list";
import { SignIn } from "@/components/sign-in";
import { IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/progress";
import { Tooltip } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-settings";
import { useStorageItem } from "@/hooks/use-storage";
import type { AddOutcome } from "@/lib/add";
import { daysLeft } from "@/lib/format";
import { managerUrl } from "@/lib/pages";
import { useUser } from "@/lib/queries";
import { authItem } from "@/lib/storage";

import { PageLinks } from "./page-links";
import { RecentTorrents } from "./recent-torrents";
import { SectionHeader } from "./section-header";

const WIDTH = "w-[400px]";

export function PopupApp(): ReactNode {
  const auth = useStorageItem(authItem);
  if (auth === undefined) return <div className={clsx("h-[520px]", WIDTH)} />;
  return (
    <div className={WIDTH}>
      {auth ? (
        <Home />
      ) : (
        <div className="h-[520px]">
          <SignIn />
        </div>
      )}
    </div>
  );
}

function openManager(route = "/"): void {
  browser.tabs.create({ url: managerUrl(route) }).catch(console.error);
  window.close();
}

function Home(): ReactNode {
  const [settings] = useSettings();
  const { data: user } = useUser();
  const [outcomes, setOutcomes] = useState<AddOutcome[]>([]);
  const [picking, setPicking] = useState<string | null>(null);

  const handleResult = (next: AddOutcome[]): void => {
    setOutcomes((previous) => mergeOutcomes(previous, next));
    const needsFiles = next.find((outcome) => outcome.ok && outcome.status === "choose-files");
    if (needsFiles?.ok && needsFiles.torrentId && next.length === 1) setPicking(needsFiles.torrentId);
  };

  const days = user ? daysLeft(user.premium) : null;
  const low = days !== null && days <= settings.expiryReminderDays;

  return (
    <div className="flex max-h-[600px] flex-col">
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
          <IconButton label="Open manager" onClick={() => openManager()}>
            <SidebarSimpleIcon />
          </IconButton>
          <IconButton label="Settings" onClick={() => openManager("/settings")}>
            <GearSixIcon />
          </IconButton>
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-2.5 px-4 pb-3">
        <Composer onResult={handleResult} />
        {outcomes.length > 0 && (
          <OutcomeList outcomes={outcomes} onChooseFiles={setPicking} onClear={() => setOutcomes([])} />
        )}
      </div>

      <PageLinks enabled={settings.scanOnOpen} onResult={handleResult} />

      <SectionHeader title="Recent">
        <button
          type="button"
          className="press -mr-2 inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12px] font-medium text-fg-2 hover:bg-fill hover:text-fg"
          onClick={() => openManager("/torrents")}
        >
          View all <ArrowRightIcon className="size-3" />
        </button>
      </SectionHeader>
      <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <RecentTorrents onChooseFiles={setPicking} />
      </div>

      <FilePicker torrentId={picking} onClose={() => setPicking(null)} />
    </div>
  );
}
