import { describe, expect, it } from "vitest";

import type { Torrent, TorrentStatus } from "@/lib/rd/types";

import { duplicateTorrents, failedTorrents } from "./cleanup";

const torrent = (id: string, hash: string, status: TorrentStatus, added: string): Torrent => ({
  id,
  hash,
  status,
  added,
  filename: id,
  bytes: 1,
  host: "real-debrid.com",
  split: 2000,
  progress: 100,
  links: [],
});

describe("duplicateTorrents", () => {
  it("keeps the ready copy even when a newer one exists", () => {
    const list = [
      torrent("old-ready", "AAA", "downloaded", "2026-01-01"),
      torrent("new-failed", "aaa", "error", "2026-02-01"),
      torrent("unique", "bbb", "downloaded", "2026-01-01"),
    ];
    expect(duplicateTorrents(list).map((t) => t.id)).toEqual(["new-failed"]);
  });

  it("keeps the newest when none are ready", () => {
    const list = [torrent("a", "ccc", "queued", "2026-01-01"), torrent("b", "ccc", "queued", "2026-03-01")];
    expect(duplicateTorrents(list).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("failedTorrents", () => {
  it("collects every failure status", () => {
    const list = (["magnet_error", "error", "virus", "dead", "downloaded", "queued"] as const).map((status, index) =>
      torrent(String(index), String(index), status, "2026-01-01"),
    );
    expect(failedTorrents(list).map((t) => t.status)).toEqual(["magnet_error", "error", "virus", "dead"]);
  });
});
