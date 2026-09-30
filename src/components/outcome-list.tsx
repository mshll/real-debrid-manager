import {
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  DownloadSimpleIcon,
  ListChecksIcon,
  PlayIcon,
  WarningCircleIcon,
  XIcon,
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

/** Newest first; a repeat of the same title replaces the older entry. */
export function mergeOutcomes(previous: AddOutcome[], next: AddOutcome[]): AddOutcome[] {
  const titles = new Set(next.map((outcome) => outcome.title));
  return [...next, ...previous.filter((outcome) => !titles.has(outcome.title))];
}

export function OutcomeList({
  outcomes,
  onChooseFiles,
  onClear,
}: {
  outcomes: AddOutcome[];
  onChooseFiles: (torrentId: string) => void;
  onClear: () => void;
}): ReactNode {
  const actions = useActions();
  const allUrls = outcomes.flatMap((outcome) => (outcome.ok ? (outcome.downloads ?? []) : []).map((d) => d.download));
  return (
    <div className="overflow-hidden rounded-[10px] bg-surface shadow-panel">
      {outcomes.length > 1 && (
        <div className="flex h-10 items-center gap-1 border-b border-border pr-1.5 pl-3">
          <span className="tabular flex-1 truncate text-[12px] text-fg-3">
            {allUrls.length
              ? `${allUrls.length} link${allUrls.length === 1 ? "" : "s"} ready`
              : `${outcomes.length} added`}
          </span>
          {allUrls.length > 1 && (
            <>
              <Button size="sm" variant="ghost" icon={<CopyIcon />} onClick={() => actions.copy(allUrls)}>
                Copy all
              </Button>
              <Button size="sm" variant="ghost" icon={<DownloadSimpleIcon />} onClick={() => actions.download(allUrls)}>
                Download all
              </Button>
            </>
          )}
          <IconButton size="sm" label="Clear" onClick={onClear}>
            <XIcon />
          </IconButton>
        </div>
      )}
      <div className="scroll-fade max-h-[196px] divide-y divide-border overflow-y-auto">
        {outcomes.map((outcome, index) => {
          const warn = !outcome.ok || outcome.status === "not-cached";
          const Icon = warn ? WarningCircleIcon : outcome.status === "waiting-metadata" ? ClockIcon : CheckCircleIcon;
          const downloads = outcome.ok ? (outcome.downloads ?? []) : [];
          const urls = downloads.map((d) => d.download);
          const first = downloads[0];
          return (
            <div key={`${outcome.title}-${index}`} className="flex items-center gap-3 px-3 py-2">
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
    </div>
  );
}
