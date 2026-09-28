import type { AddOutcome } from "./add";

const HEADLINES = {
  started: "Added to Real-Debrid",
  "choose-files": "Choose files to start",
  "waiting-metadata": "Fetching torrent info",
  duplicate: "Already in your library",
  "not-cached": "Not cached, removed",
  unrestricted: "Link ready",
} as const;

export function describeOutcomes(outcomes: AddOutcome[]): { title: string; message: string; ok: boolean } {
  const failed = outcomes.filter((outcome) => !outcome.ok);
  const [only] = outcomes;
  if (outcomes.length === 1 && only) {
    if (!only.ok) return { title: "Couldn't add", message: `${only.error}\n${only.title}`, ok: false };
    const detail = only.status === "waiting-metadata" ? `${only.title}\nIt will start automatically` : only.title;
    return { title: HEADLINES[only.status], message: detail, ok: true };
  }
  const added = outcomes.length - failed.length;
  return {
    title: failed.length ? `Added ${added} of ${outcomes.length}` : `Added ${added} items`,
    message: failed.length ? failed.map((outcome) => (outcome.ok ? "" : outcome.error)).join("\n") : "",
    ok: failed.length === 0,
  };
}
