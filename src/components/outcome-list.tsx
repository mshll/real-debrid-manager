import {
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  DownloadSimpleIcon,
  ListChecksIcon,
  PlayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type { ReactNode } from "react";

import { useActions } from "@/hooks/use-actions";
import type { AddOutcome } from "@/lib/add";

import { Button, IconButton } from "./ui/button";

const STATUS_TEXT = {
  started: "Added and started",
  "choose-files": "Choose files to start",
  "waiting-metadata": "Fetching info, starts on its own",
  duplicate: "Already in your library",
  "not-cached": "Not cached, removed",
  unrestricted: "Link ready",
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
    <div className="divide-y divide-border overflow-hidden rounded-[10px] bg-surface shadow-panel">
      {outcomes.map((outcome, index) => {
        const warn = !outcome.ok || outcome.status === "not-cached";
        const Icon = warn ? WarningCircleIcon : outcome.status === "waiting-metadata" ? ClockIcon : CheckCircleIcon;
        const downloads = outcome.ok ? (outcome.downloads ?? []) : [];
        const urls = downloads.map((d) => d.download);
        const first = downloads[0];
        return (
          <div key={`${outcome.title}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
            <Icon
              weight="fill"
              className={clsx(
                "size-4 shrink-0",
                warn
                  ? "text-danger"
                  : outcome.ok && outcome.status === "waiting-metadata"
                    ? "text-info"
                    : "text-accent",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium" title={outcome.title}>
                {outcome.title}
              </div>
              <div className={clsx("truncate text-[12px]", warn ? "text-danger" : "text-fg-3")}>
                {outcome.ok ? STATUS_TEXT[outcome.status] : outcome.error}
              </div>
            </div>
            {outcome.ok && outcome.status === "choose-files" && outcome.torrentId && (
              <Button size="sm" icon={<ListChecksIcon />} onClick={() => onChooseFiles(outcome.torrentId ?? "")}>
                Choose
              </Button>
            )}
            {urls.length > 0 && (
              <div className="flex shrink-0 gap-0.5">
                {downloads.length === 1 && first?.streamable === 1 && (
                  <IconButton label="Play" onClick={() => actions.stream(first.download, first.id)}>
                    <PlayIcon />
                  </IconButton>
                )}
                <IconButton label="Copy link" onClick={() => actions.copy(urls)}>
                  <CopyIcon />
                </IconButton>
                <IconButton label="Download" onClick={() => actions.download(urls)}>
                  <DownloadSimpleIcon />
                </IconButton>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
