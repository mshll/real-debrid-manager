import type { TorrentStatus } from "./rd/types";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** Powers of 1024 with GB-style labels, matching the Real-Debrid website. */
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const exponent = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${UNITS[exponent]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelative(date: string | number): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDate(date: string | number): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function daysLeft(premiumSeconds: number): number {
  return Math.floor(premiumSeconds / 86400);
}

export type Tone = "accent" | "info" | "warning" | "danger" | "neutral";

export const STATUS: Record<TorrentStatus, { label: string; tone: Tone; active: boolean }> = {
  magnet_conversion: { label: "Fetching info", tone: "info", active: true },
  waiting_files_selection: { label: "Choose files", tone: "warning", active: true },
  queued: { label: "Queued", tone: "neutral", active: true },
  downloading: { label: "Downloading", tone: "info", active: true },
  compressing: { label: "Compressing", tone: "info", active: true },
  uploading: { label: "Uploading", tone: "info", active: true },
  downloaded: { label: "Ready", tone: "accent", active: false },
  magnet_error: { label: "Magnet error", tone: "danger", active: false },
  error: { label: "Error", tone: "danger", active: false },
  virus: { label: "Virus detected", tone: "danger", active: false },
  dead: { label: "Dead", tone: "danger", active: false },
};

export function isActive(status: TorrentStatus): boolean {
  return STATUS[status].active;
}

export function isFailed(status: TorrentStatus): boolean {
  return STATUS[status].tone === "danger";
}
