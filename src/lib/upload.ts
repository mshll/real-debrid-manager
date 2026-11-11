import type { AddOutcome } from "./add";
import { sendMessage } from "./messaging";

/** Hands .torrent files to the worker, so the upload finishes even if the popup closes. */
export async function uploadTorrentFiles(files: File[]): Promise<AddOutcome[]> {
  const outcomes: AddOutcome[] = [];
  for (const file of files) {
    outcomes.push(await sendMessage("uploadTorrent", { name: file.name, data: toBase64(await file.arrayBuffer()) }));
  }
  return outcomes;
}

export function isTorrentFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".torrent");
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
}
