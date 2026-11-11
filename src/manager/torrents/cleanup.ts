import { isFailed } from "@/lib/format";
import type { Torrent } from "@/lib/rd/types";

export function failedTorrents(torrents: Torrent[]): Torrent[] {
  return torrents.filter((torrent) => isFailed(torrent.status));
}

/** Same hash added more than once: keep the best copy (ready first, then newest). */
export function duplicateTorrents(torrents: Torrent[]): Torrent[] {
  const byHash = new Map<string, Torrent[]>();
  for (const torrent of torrents) {
    const group = byHash.get(torrent.hash.toLowerCase()) ?? [];
    group.push(torrent);
    byHash.set(torrent.hash.toLowerCase(), group);
  }
  const extras: Torrent[] = [];
  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    const [, ...rest] = [...group].sort(
      (a, b) =>
        Number(b.status === "downloaded") - Number(a.status === "downloaded") ||
        Date.parse(b.added) - Date.parse(a.added),
    );
    extras.push(...rest);
  }
  return extras;
}
