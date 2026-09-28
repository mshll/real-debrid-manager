import { PanelsTopLeft, Settings } from "lucide-react";
import { useState, type ReactNode } from "react";
import { browser } from "wxt/browser";

import { Composer } from "@/components/composer";
import { FilePicker } from "@/components/file-picker";
import { Logo } from "@/components/logo";
import { OutcomeList } from "@/components/outcome-list";
import { SignIn } from "@/components/sign-in";
import { IconButton } from "@/components/ui/button";
import { managerUrl } from "@/lib/pages";
import { useSettings } from "@/hooks/use-settings";
import { useStorageItem } from "@/hooks/use-storage";
import type { AddOutcome } from "@/lib/add";
import { daysLeft } from "@/lib/format";
import { useUser } from "@/lib/queries";
import { authItem } from "@/lib/storage";

import { PageLinks } from "./page-links";
import { RecentTorrents } from "./recent-torrents";

export function PopupApp(): ReactNode {
  const auth = useStorageItem(authItem);
  if (auth === undefined) return <div className="h-[480px] w-[380px]" />;
  return (
    <div className="w-[380px]">
      {auth ? (
        <Home />
      ) : (
        <div className="h-[480px]">
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
    setOutcomes(next);
    const needsFiles = next.find((outcome) => outcome.ok && outcome.status === "choose-files");
    if (needsFiles?.ok && needsFiles.torrentId && next.length === 1) setPicking(needsFiles.torrentId);
  };

  const days = user ? daysLeft(user.premium) : null;

  return (
    <div className="flex max-h-[600px] flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 px-3.5">
        <Logo className="size-5" />
        <span className="text-[13px] font-semibold">Real-Debrid</span>
        {user && (
          <button
            type="button"
            onClick={() => openManager("/account")}
            className={`tabular ml-1 text-[11.5px] hover:text-fg ${days !== null && days <= settings.expiryReminderDays ? "text-warning" : "text-fg-3"}`}
          >
            {user.type === "premium" ? `${days} days left` : "Free account"}
          </button>
        )}
        <div className="ml-auto flex items-center">
          <IconButton label="Open Manager" onClick={() => openManager()}>
            <PanelsTopLeft />
          </IconButton>
          <IconButton label="Settings" onClick={() => openManager("/settings")}>
            <Settings />
          </IconButton>
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-2 px-3.5 pb-3">
        <Composer onResult={handleResult} />
        {outcomes.length > 0 && <OutcomeList outcomes={outcomes} onChooseFiles={setPicking} />}
        <PageLinks enabled={settings.scanOnOpen} onResult={handleResult} />
      </div>

      <div className="flex items-center justify-between px-3.5 pb-1">
        <h2 className="text-[12px] font-semibold text-fg-2">Recent</h2>
        <button
          type="button"
          className="text-[12px] text-accent hover:underline"
          onClick={() => openManager("/torrents")}
        >
          See all
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-2">
        <RecentTorrents onChooseFiles={setPicking} />
      </div>

      <FilePicker torrentId={picking} onClose={() => setPicking(null)} />
    </div>
  );
}
