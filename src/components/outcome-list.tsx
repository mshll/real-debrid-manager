import clsx from "clsx";
import { AlertCircle, CheckCircle2, Clock, Copy, Download, ListChecks, Play } from "lucide-react";
import type { ReactNode } from "react";

import { useActions } from "@/hooks/use-actions";
import type { AddOutcome } from "@/lib/add";

import { Button, IconButton } from "./ui/button";

const STATUS_TEXT = {
  started: "Added",
  "choose-files": "Choose files to start",
  "waiting-metadata": "Fetching info, starts automatically",
  duplicate: "Already in library",
  "not-cached": "Not cached, removed",
  unrestricted: "Ready",
} as const;

export function OutcomeList({
  outcomes,
  onChooseFiles,
}: {
  outcomes: AddOutcome[];
  onChooseFiles: (torrentId: string) => void;
}): ReactNode {
  const actions = useActions();
  return (
    <div className="[&>*+*]:hairline-t overflow-hidden rounded-[10px] bg-surface shadow-card">
      {outcomes.map((outcome, index) => {
        const warn = !outcome.ok || outcome.status === "not-cached";
        const Icon = !outcome.ok ? AlertCircle : outcome.status === "waiting-metadata" ? Clock : CheckCircle2;
        const downloads = outcome.ok ? (outcome.downloads ?? []) : [];
        const urls = downloads.map((d) => d.download);
        const first = downloads[0];
        return (
          <div key={`${outcome.title}-${index}`} className="flex items-center gap-2.5 px-3 py-2">
            <Icon className={clsx("size-4 shrink-0", warn ? "text-danger" : "text-accent")} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px]" title={outcome.title}>
                {outcome.title}
              </div>
              <div className={clsx("truncate text-[11.5px]", warn ? "text-danger" : "text-fg-2")}>
                {outcome.ok ? STATUS_TEXT[outcome.status] : outcome.error}
              </div>
            </div>
            {outcome.ok && outcome.status === "choose-files" && outcome.torrentId && (
              <Button
                size="sm"
                icon={<ListChecks className="size-3.5" />}
                onClick={() => onChooseFiles(outcome.torrentId ?? "")}
              >
                Choose
              </Button>
            )}
            {urls.length > 0 && (
              <div className="flex shrink-0">
                {downloads.length === 1 && first?.streamable === 1 && (
                  <IconButton label="Play" onClick={() => actions.stream(first.download, first.id)}>
                    <Play />
                  </IconButton>
                )}
                <IconButton label="Copy link" onClick={() => actions.copy(urls)}>
                  <Copy />
                </IconButton>
                <IconButton label="Download" onClick={() => actions.download(urls)}>
                  <Download />
                </IconButton>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
