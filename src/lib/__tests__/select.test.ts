import { describe, expect, it } from "vitest";

import type { TorrentFile } from "../rd/types";
import { chooseFiles } from "../select";

const file = (id: number, path: string, bytes: number): TorrentFile => ({ id, path, bytes, selected: 0 });

describe("chooseFiles", () => {
  const movie = [
    file(1, "/Movie/Movie.2024.mkv", 8e9),
    file(2, "/Movie/Movie.sample.mkv", 5e7),
    file(3, "/Movie/Movie.nfo", 1e3),
    file(4, "/Movie/Extras/Behind.mkv", 4e8),
  ];

  it("keeps main videos and drops samples, extras and junk", () => {
    expect(chooseFiles(movie, "video")).toEqual([1]);
  });

  it("keeps every episode of a season", () => {
    const season = [file(1, "/S01/E01.mkv", 1e9), file(2, "/S01/E02.mkv", 1e9), file(3, "/S01/cover.jpg", 1e5)];
    expect(chooseFiles(season, "video")).toEqual([1, 2]);
  });

  it("falls back to samples when they are the only video", () => {
    expect(chooseFiles([file(1, "/sample.mkv", 1e7), file(2, "/info.txt", 1)], "video")).toEqual([1]);
  });

  it("falls back to audio for music releases", () => {
    expect(chooseFiles([file(1, "/01.flac", 3e7), file(2, "/cover.jpg", 1e5)], "video")).toEqual([1]);
  });

  it("selects all when nothing matches or everything matches", () => {
    expect(chooseFiles([file(1, "/a.iso", 1), file(2, "/b.txt", 1)], "video")).toBe("all");
    expect(chooseFiles([file(1, "/a.mkv", 1), file(2, "/b.mkv", 1)], "video")).toBe("all");
  });

  it("picks the largest file", () => {
    expect(chooseFiles(movie, "largest")).toEqual([1]);
  });
});
