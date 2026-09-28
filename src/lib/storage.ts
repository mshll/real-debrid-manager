import { storage } from "wxt/utils/storage";

export type Auth =
  | {
      kind: "oauth";
      clientId: string;
      clientSecret: string;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }
  | { kind: "token"; accessToken: string };

export type FileSelection = "video" | "all" | "largest" | "ask";
export type Player = "browser" | "iina" | "vlc" | "infuse";
export type PrimaryAction = "download" | "stream" | "copy" | "aria2";

export interface Aria2Config {
  url: string;
  secret: string;
  dir: string;
}

export interface Settings {
  fileSelection: FileSelection;
  autoStartExternal: boolean;
  onlyCached: boolean;
  skipDuplicates: boolean;
  interceptMagnets: boolean;
  scanOnOpen: boolean;
  notifyComplete: boolean;
  notifyErrors: boolean;
  expiryReminderDays: number;
  showBadge: boolean;
  theme: "system" | "light" | "dark";
  primaryAction: PrimaryAction;
  player: Player;
  aria2: Aria2Config;
}

export const DEFAULT_SETTINGS: Settings = {
  fileSelection: "video",
  autoStartExternal: false,
  onlyCached: false,
  skipDuplicates: true,
  interceptMagnets: false,
  scanOnOpen: true,
  notifyComplete: true,
  notifyErrors: true,
  expiryReminderDays: 7,
  showBadge: true,
  theme: "system",
  primaryAction: "download",
  player: "browser",
  aria2: { url: "http://localhost:6800/jsonrpc", secret: "", dir: "" },
};

export const authItem = storage.defineItem<Auth | null>("local:auth", { fallback: null });

export const settingsItem = storage.defineItem<Settings>("sync:settings", {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await settingsItem.getValue()) };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await settingsItem.setValue({ ...(await getSettings()), ...patch });
}

export const hostRegexItem = storage.defineItem<{ patterns: string[]; folders: string[]; fetchedAt: number } | null>(
  "local:hostRegex",
  { fallback: null },
);

export interface PendingSelection {
  rule: FileSelection;
  onlyCached: boolean;
  addedAt: number;
  /** Set while an add call is still waiting on this torrent, so the sweep leaves it alone. */
  inFlight?: boolean;
}

/** Torrents the extension added and still needs to select files for. */
export const pendingSelectionItem = storage.defineItem<Record<string, PendingSelection>>("local:pendingSelection", {
  fallback: {},
});

/** Read-modify-write under a Web Lock: the add flow, sync sweep and file picker all touch this. */
export async function updatePending(mutate: (pending: Record<string, PendingSelection>) => void): Promise<void> {
  await navigator.locks.request("rd-pending", async () => {
    const pending = { ...(await pendingSelectionItem.getValue()) };
    mutate(pending);
    await pendingSelectionItem.setValue(pending);
  });
}

export const torrentSnapshotItem = storage.defineItem<Record<string, string>>("local:torrentSnapshot", {
  fallback: {},
});

export const expiryNotifiedItem = storage.defineItem<number | null>("local:expiryNotified", { fallback: null });

/** Bumped whenever the background changes the library, so open UIs can refetch. */
export const libraryStampItem = storage.defineItem<number>("local:libraryStamp", { fallback: 0 });

export async function touchLibrary(): Promise<void> {
  await libraryStampItem.setValue(Date.now());
}

export interface LoginState {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  interval: number;
  expiresAt: number;
  error?: string;
}

export const loginStateItem = storage.defineItem<LoginState | null>("session:login", { fallback: null });
