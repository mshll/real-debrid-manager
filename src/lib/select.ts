import type { TorrentFile } from "./rd/types";
import type { FileSelection } from "./storage";

const VIDEO = /\.(mkv|mp4|m4v|avi|mov|wmv|webm|ts|m2ts|mpg|mpeg|flv|divx|ogm)$/i;
const AUDIO = /\.(flac|mp3|m4a|aac|ogg|opus|wav|alac|ape|wv|dsf)$/i;
const SAMPLE = /(^|[\s._\-/[(])(sample|trailer|featurettes?|extras?)([\s._\-\])/]|$)/i;

export function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function isVideo(path: string): boolean {
  return VIDEO.test(path);
}

export function isAudio(path: string): boolean {
  return AUDIO.test(path);
}

/**
 * Picks the files to start a torrent with. "video" prefers real video over
 * samples/extras, falls back to audio for music releases, then to everything,
 * so a torrent is never left waiting because nothing matched.
 */
export function chooseFiles(files: TorrentFile[], rule: Exclude<FileSelection, "ask">): number[] | "all" {
  if (rule === "all" || files.length <= 1) return "all";
  if (rule === "largest") {
    const largest = files.reduce((a, b) => (b.bytes > a.bytes ? b : a));
    return [largest.id];
  }
  const videos = files.filter((file) => isVideo(file.path));
  const main = videos.filter((file) => !SAMPLE.test(file.path));
  const picked = main.length ? main : videos.length ? videos : files.filter((file) => isAudio(file.path));
  if (!picked.length || picked.length === files.length) return "all";
  return picked.map((file) => file.id);
}
