import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { SignIn } from "@/components/sign-in";
import { useStorageItem } from "@/hooks/use-storage";
import type { AddOutcome } from "@/lib/add";
import { getHostMatchers } from "@/lib/hosts";
import { extractLinks } from "@/lib/links";
import { sendMessage } from "@/lib/messaging";
import { describeOutcomes } from "@/lib/outcome";
import { addTorrentFile } from "@/lib/rd/api";
import { errorMessage } from "@/lib/rd/errors";
import { authItem } from "@/lib/storage";

import { AccountView } from "./account";
import { AddDialog } from "./add-dialog";
import { CommandPalette } from "./command-palette";
import { DownloadsView } from "./downloads";
import { useRoute } from "./router";
import { SettingsView } from "./settings";
import { Sidebar, type Section } from "./sidebar";
import { TorrentsView } from "./torrents/view";

const PlayerView = lazy(() => import("./player").then((module) => ({ default: module.PlayerView })));

const SECTIONS: Section[] = ["torrents", "downloads", "account", "settings"];

export function ManagerApp(): ReactNode {
  const auth = useStorageItem(authItem);
  const route = useRoute();
  if (auth === undefined) return null;
  if (!auth) {
    return (
      <div className="flex h-screen items-center justify-center bg-grouped">
        <div className="h-[480px] w-[400px] rounded-[16px] bg-bg shadow-popover">
          <SignIn />
        </div>
      </div>
    );
  }
  if (route[0] === "watch" && route[1]) {
    return (
      <Suspense fallback={<div className="h-screen bg-black" />}>
        <PlayerView id={route[1]} />
      </Suspense>
    );
  }
  return <Shell route={route} />;
}

function report(outcomes: AddOutcome[]): void {
  const summary = describeOutcomes(outcomes);
  if (summary.ok) toast.success(summary.title, { description: summary.message });
  else toast.error(summary.title, { description: summary.message });
}

function Shell({ route }: { route: string[] }): ReactNode {
  const section = SECTIONS.find((candidate) => candidate === route[0]) ?? "torrents";
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearching((open) => !open);
      }
    };
    // Pasting anywhere outside a field adds whatever links were pasted.
    const onPaste = (event: ClipboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const text = event.clipboardData?.getData("text") ?? "";
      getHostMatchers()
        .then(async (matchers) => {
          const links = extractLinks(text, matchers, { bareHashes: true });
          if (!links.length) return;
          const id = toast.loading(`Adding ${links.length}`);
          const outcomes = await sendMessage("addLinks", { links });
          toast.dismiss(id);
          report(outcomes);
        })
        .catch((error: unknown) => toast.error(errorMessage(error)));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  const uploadFiles = async (files: File[]): Promise<void> => {
    const torrents = files.filter((file) => file.name.toLowerCase().endsWith(".torrent"));
    if (!torrents.length) return;
    const outcomes: AddOutcome[] = [];
    for (const file of torrents) {
      try {
        const added = await addTorrentFile(file);
        outcomes.push(await sendMessage("startUploadedTorrent", { id: added.id, name: file.name }));
      } catch (error) {
        outcomes.push({ ok: false, kind: "torrent", title: file.name, error: errorMessage(error) });
      }
    }
    report(outcomes);
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropping(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropping(false);
        uploadFiles([...event.dataTransfer.files]).catch(console.error);
      }}
    >
      <Sidebar section={section} onSearch={() => setSearching(true)} />
      <main className="flex min-w-0 flex-1 bg-bg">
        {section === "torrents" && <TorrentsView detailId={route[1] ?? null} onAdd={() => setAdding(true)} />}
        {section === "downloads" && <DownloadsView />}
        {section === "account" && <AccountView />}
        {section === "settings" && <SettingsView />}
      </main>
      {dropping && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-[16px] border-2 border-dashed border-accent bg-accent-soft backdrop-blur-sm">
          <span className="text-[15px] font-medium">Drop .torrent files to add</span>
        </div>
      )}
      <AddDialog open={adding} onOpenChange={setAdding} />
      <CommandPalette open={searching} onOpenChange={setSearching} onAdd={() => setAdding(true)} />
    </div>
  );
}
