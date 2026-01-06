import {
  createMessageListener,
  success,
  error,
  type MessageHandler,
  type DetectedLink,
} from "~lib/messaging";
import { storage } from "~lib/storage";
import {
  type AuthData,
  isTokenExpired,
  refreshAccessToken,
  OAuthFlow,
  type DeviceCodeResponse,
} from "~lib/auth";
import {
  getUser,
  unrestrictLink,
  unrestrictFolder,
  listTorrents,
  getTorrentInfo,
  addMagnet,
  addTorrent,
  selectFiles,
  deleteTorrent,
  getActiveCount,
  listDownloads,
  deleteDownload,
  getHostsRegex,
  getHostsDomains,
  RealDebridApiError,
} from "~lib/api";
import type { TorrentItem, TorrentStatus } from "~lib/api/torrents";

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
  typeof navigator.userAgent === "string" && navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");

const POLLING_ALARM_NAME = "torrent-polling";
const POLLING_INTERVAL_MINUTES = 0.5; // 30 seconds
const BADGE_COLOR = "#B7D995"; // Primary green for torrents
const LINKS_BADGE_COLOR = "#9ED1EC";

const knownTorrents = new Map<string, TorrentStatus>();

const ACTIVE_STATUSES: TorrentStatus[] = [
  "magnet_conversion",
  "queued",
  "downloading",
  "compressing",
  "uploading",
];

const detectedLinksByTab = new Map<number, DetectedLink[]>();

function getActiveTorrentCount(): number {
  return Array.from(knownTorrents.values()).filter((status) =>
    ACTIVE_STATUSES.includes(status)
  ).length;
}

async function updateBadgeForTab(tabId: number): Promise<void> {
  try {
    const links = detectedLinksByTab.get(tabId) || [];

    if (links.length > 0) {
      // Show link count (blue badge) - per-tab, higher priority
      await chrome.action.setBadgeText({ text: String(links.length), tabId });
      await chrome.action.setBadgeBackgroundColor({ color: LINKS_BADGE_COLOR, tabId });
    } else {
      // No detected links - fall back to torrent count (green badge)
      const activeTorrents = getActiveTorrentCount();
      if (activeTorrents > 0) {
        await chrome.action.setBadgeText({ text: String(activeTorrents), tabId });
        await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId });
      } else {
        await chrome.action.setBadgeText({ text: "", tabId });
      }
    }
  } catch (err) {
    // Tab might be closed or invalid - ignore
  }
}

function clearTabLinks(tabId: number): void {
  detectedLinksByTab.delete(tabId);
}

function isActiveTorrent(status: TorrentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

async function updateBadge(activeCount: number): Promise<void> {
  try {
    if (activeCount > 0) {
      await chrome.action.setBadgeText({ text: String(activeCount) });
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (err) {
  }
}

async function showTorrentCompletedNotification(torrent: TorrentItem): Promise<void> {
  try {
    const preferences = await storage.getPreferences();

    if (!preferences.notificationsEnabled) {
      return;
    }

    const notificationId = `torrent-completed-${torrent.id}`;

    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: "Torrent Download Complete",
      message: torrent.filename,
    });
  } catch (err) {
  }
}

try {
  chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith("torrent-completed-")) {
      chrome.action.openPopup?.().catch(() => {
        chrome.runtime.openOptionsPage?.();
      });
      chrome.notifications.clear(notificationId);
    }
  });
} catch (err) {
}

async function pollTorrents(): Promise<void> {
  try {
    const isAuthenticated = await storage.isAuthenticated();
    if (!isAuthenticated) {
      await stopPolling();
      return;
    }

    const token = await getValidToken();
    const torrents = await listTorrents(token, { limit: 100 });

    let activeCount = 0;
    const currentTorrentIds = new Set<string>();

    for (const torrent of torrents) {
      currentTorrentIds.add(torrent.id);
      const previousStatus = knownTorrents.get(torrent.id);

      // Check if torrent just completed
      if (
        previousStatus &&
        previousStatus !== "downloaded" &&
        torrent.status === "downloaded"
      ) {
        await showTorrentCompletedNotification(torrent);
      }

      // Update known status
      knownTorrents.set(torrent.id, torrent.status);

      // Count active torrents
      if (isActiveTorrent(torrent.status)) {
        activeCount++;
      }
    }

    for (const id of knownTorrents.keys()) {
      if (!currentTorrentIds.has(id)) {
        knownTorrents.delete(id);
      }
    }

    await updateBadge(activeCount);

    if (activeCount === 0) {
      await stopPolling();
    }
  } catch (err) {
    console.error("Error polling torrents:", err);
  }
}

function hasAlarmsSupport(): boolean {
  return typeof chrome.alarms !== "undefined" && typeof chrome.alarms.create === "function";
}

async function startPolling(): Promise<void> {
  if (!hasAlarmsSupport()) return;

  try {
    const existingAlarm = await chrome.alarms.get(POLLING_ALARM_NAME);
    if (existingAlarm) return;

    await pollTorrents();
    await chrome.alarms.create(POLLING_ALARM_NAME, {
      periodInMinutes: POLLING_INTERVAL_MINUTES,
    });
  } catch (err) {
    console.error("Error starting polling:", err);
  }
}

async function stopPolling(): Promise<void> {
  if (!hasAlarmsSupport()) return;

  try {
    await chrome.alarms.clear(POLLING_ALARM_NAME);
    await updateBadge(0);
  } catch (err) {
    console.error("Error stopping polling:", err);
  }
}

async function checkAndUpdatePolling(): Promise<void> {
  try {
    const isAuthenticated = await storage.isAuthenticated();
    if (!isAuthenticated) {
      await stopPolling();
      return;
    }

    const token = await getValidToken();
    const activeCountResponse = await getActiveCount(token);

    if (activeCountResponse.nb > 0) {
      await startPolling();
    } else {
      await stopPolling();
    }
  } catch (err) {
    console.error("Error checking polling status:", err);
  }
}

try {
  if (hasAlarmsSupport()) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === POLLING_ALARM_NAME) {
        pollTorrents();
      }
    });
  }
} catch (err) {
}

async function initializePolling(): Promise<void> {
  await checkAndUpdatePolling();
}

async function getValidToken(): Promise<string> {
  const authData = await storage.getAuthData();

  if (!authData) {
    throw new Error("Not authenticated");
  }

  if (isTokenExpired(authData)) {
    try {
      const tokenResponse = await refreshAccessToken(
        authData.clientId,
        authData.clientSecret,
        authData.refreshToken
      );

      const updatedAuthData: AuthData = {
        ...authData,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      };

      await storage.setAuthData(updatedAuthData);
      return updatedAuthData.accessToken;
    } catch (err) {
      await storage.removeAuthData();
      throw new Error("Session expired. Please log in again.");
    }
  }

  return authData.accessToken;
}

async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string; errorCode?: number }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof RealDebridApiError) {
      return { success: false, error: err.message, errorCode: err.code };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

let activeOAuthFlow: OAuthFlow | null = null;
let pendingOAuthResolve: ((result: { success: boolean; error?: string }) => void) | null = null;

const handleAuthStatus: MessageHandler<"AUTH_STATUS"> = async () => {
  const isAuthenticated = await storage.isAuthenticated();
  if (isAuthenticated) {
    try {
      const token = await getValidToken();
      const profile = await getUser(token);
      await storage.cacheUserProfile(profile);
      return success({ authenticated: true, profile });
    } catch {
      return success({ authenticated: false });
    }
  }
  return success({ authenticated: false });
};

const handleLogin: MessageHandler<"AUTH_LOGIN"> = async (payload) => {
  if (payload?.token) {
    try {
      const profile = await getUser(payload.token);
      await storage.setToken(payload.token);
      await storage.cacheUserProfile(profile);
      return success({ success: true });
    } catch (err) {
      return success({
        success: false,
        error: err instanceof Error ? err.message : "Invalid token",
      });
    }
  }
  return success({ success: false, error: "No token provided" });
};

const handleLogout: MessageHandler<"AUTH_LOGOUT"> = async () => {
  await storage.removeAuthData();
  return success({ success: true });
};

const handleGetUserProfile: MessageHandler<"GET_USER_PROFILE"> = async () => {
  const cached = await storage.getCachedUserProfile();
  if (cached) return success(cached);

  const token = await getValidToken();
  const profile = await getUser(token);
  await storage.cacheUserProfile(profile);
  return success(profile);
};

const handleUnrestrictLink: MessageHandler<"UNRESTRICT_LINK"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(() =>
    unrestrictLink(token, {
      link: payload.link,
      password: payload.password,
      remote: payload.remote ? 1 : undefined,
    })
  );
};

const handleUnrestrictFolder: MessageHandler<"UNRESTRICT_FOLDER"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(() => unrestrictFolder(token, payload.link));
};

const handleListTorrents: MessageHandler<"LIST_TORRENTS"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(() =>
    listTorrents(token, {
      offset: payload?.offset,
      limit: payload?.limit,
    })
  );
};

const handleGetTorrentInfo: MessageHandler<"GET_TORRENT_INFO"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(() => getTorrentInfo(token, payload.id));
};

const handleAddMagnet: MessageHandler<"ADD_MAGNET"> = async (payload) => {
  const token = await getValidToken();
  const result = await withErrorHandling(() => addMagnet(token, payload.magnet));
  if (result.success) startPolling();
  return result;
};

const handleAddTorrent: MessageHandler<"ADD_TORRENT"> = async (payload) => {
  const token = await getValidToken();
  const result = await withErrorHandling(() => addTorrent(token, payload.fileData));
  if (result.success) startPolling();
  return result;
};

const handleSelectFiles: MessageHandler<"SELECT_TORRENT_FILES"> = async (payload) => {
  const token = await getValidToken();
  const result = await withErrorHandling(async () => {
    await selectFiles(token, payload.id, payload.files);
  });
  if (result.success) startPolling();
  return result;
};

const handleDeleteTorrent: MessageHandler<"DELETE_TORRENT"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(async () => {
    await deleteTorrent(token, payload.id);
  });
};

const handleGetActiveTorrentCount: MessageHandler<"GET_ACTIVE_TORRENT_COUNT"> = async () => {
  const token = await getValidToken();
  return withErrorHandling(() => getActiveCount(token));
};

const handleListDownloads: MessageHandler<"LIST_DOWNLOADS"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(() =>
    listDownloads(token, {
      offset: payload?.offset,
      limit: payload?.limit,
    })
  );
};

const handleDeleteDownload: MessageHandler<"DELETE_DOWNLOAD"> = async (payload) => {
  const token = await getValidToken();
  return withErrorHandling(async () => {
    await deleteDownload(token, payload.id);
  });
};

const handleGetHostsRegex: MessageHandler<"GET_HOSTS_REGEX"> = async () => {
  const cached = await storage.getCachedHostsRegex();
  if (cached) return success(cached);

  return withErrorHandling(async () => {
    const patterns = await getHostsRegex();
    await storage.cacheHostsRegex(patterns);
    return patterns;
  });
};

const handleGetHostsDomains: MessageHandler<"GET_HOSTS_DOMAINS"> = async () => {
  const cached = await storage.getCachedDomains();
  if (cached) return success(cached);

  return withErrorHandling(async () => {
    const domains = await getHostsDomains();
    await storage.cacheDomains(domains);
    return domains;
  });
};

const handleShowNotification: MessageHandler<"SHOW_NOTIFICATION"> = async (payload) => {
  try {
    const preferences = await storage.getPreferences();
    if (preferences.notificationsEnabled) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon.png"),
        title: payload.title,
        message: payload.message,
      });
    }
  } catch (err) {
  }
  return success(undefined);
};

const handleReportDetectedLinks: MessageHandler<"REPORT_DETECTED_LINKS"> = async (payload, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return success(undefined);

  detectedLinksByTab.set(tabId, payload.links);
  await updateBadgeForTab(tabId);
  return success(undefined);
};

const handleGetDetectedLinks: MessageHandler<"GET_DETECTED_LINKS"> = async (_payload, sender) => {
  const tabId = sender.tab?.id;

  if (!tabId) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        return success(detectedLinksByTab.get(activeTab.id) || []);
      }
    } catch (err) {
    }
    return success([]);
  }

  return success(detectedLinksByTab.get(tabId) || []);
};

createMessageListener({
  AUTH_STATUS: handleAuthStatus,
  AUTH_LOGIN: handleLogin,
  AUTH_LOGOUT: handleLogout,
  GET_USER_PROFILE: handleGetUserProfile,
  UNRESTRICT_LINK: handleUnrestrictLink,
  UNRESTRICT_FOLDER: handleUnrestrictFolder,
  LIST_TORRENTS: handleListTorrents,
  GET_TORRENT_INFO: handleGetTorrentInfo,
  ADD_MAGNET: handleAddMagnet,
  ADD_TORRENT: handleAddTorrent,
  SELECT_TORRENT_FILES: handleSelectFiles,
  DELETE_TORRENT: handleDeleteTorrent,
  GET_ACTIVE_TORRENT_COUNT: handleGetActiveTorrentCount,
  LIST_DOWNLOADS: handleListDownloads,
  DELETE_DOWNLOAD: handleDeleteDownload,
  GET_HOSTS_REGEX: handleGetHostsRegex,
  GET_HOSTS_DOMAINS: handleGetHostsDomains,
  SHOW_NOTIFICATION: handleShowNotification,
  REPORT_DETECTED_LINKS: handleReportDetectedLinks,
  GET_DETECTED_LINKS: handleGetDetectedLinks,
});

export interface OAuthFlowState {
  status: "idle" | "pending" | "success" | "error";
  deviceCode?: DeviceCodeResponse;
  error?: string;
}

let oauthFlowState: OAuthFlowState = { status: "idle" };

export async function startOAuthFlow(): Promise<DeviceCodeResponse> {
  if (activeOAuthFlow) {
    activeOAuthFlow.cancel();
  }

  activeOAuthFlow = new OAuthFlow();
  oauthFlowState = { status: "pending" };

  return new Promise((resolve, reject) => {
    activeOAuthFlow!.start({
      onDeviceCode: (deviceCode) => {
        oauthFlowState = { status: "pending", deviceCode };
        resolve(deviceCode);
      },
      onSuccess: async (authData) => {
        await storage.setAuthData(authData);
        oauthFlowState = { status: "success" };
        activeOAuthFlow = null;
        if (pendingOAuthResolve) {
          pendingOAuthResolve({ success: true });
          pendingOAuthResolve = null;
        }
      },
      onError: (err) => {
        oauthFlowState = { status: "error", error: err.message };
        activeOAuthFlow = null;
        if (pendingOAuthResolve) {
          pendingOAuthResolve({ success: false, error: err.message });
          pendingOAuthResolve = null;
        }
        reject(err);
      },
    });
  });
}

export function waitForOAuthComplete(): Promise<{ success: boolean; error?: string }> {
  if (oauthFlowState.status === "success") {
    return Promise.resolve({ success: true });
  }
  if (oauthFlowState.status === "error") {
    return Promise.resolve({ success: false, error: oauthFlowState.error });
  }
  if (oauthFlowState.status === "idle") {
    return Promise.resolve({ success: false, error: "No OAuth flow in progress" });
  }

  return new Promise((resolve) => {
    pendingOAuthResolve = resolve;
  });
}

export function cancelOAuthFlow(): void {
  if (activeOAuthFlow) {
    activeOAuthFlow.cancel();
    activeOAuthFlow = null;
  }
  oauthFlowState = { status: "idle" };
  if (pendingOAuthResolve) {
    pendingOAuthResolve({ success: false, error: "Cancelled" });
    pendingOAuthResolve = null;
  }
}

export function getOAuthFlowState(): OAuthFlowState {
  return { ...oauthFlowState };
}

const CONTEXT_MENU_ADD = "add-to-real-debrid";

function registerContextMenus(): void {
  try {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ADD,
      title: "Add to Real-Debrid",
      contexts: ["link"],
    });
  } catch (err) {
  }
}

try {
  chrome.contextMenus.onClicked.addListener(async (info) => {
    const linkUrl = info.linkUrl;
    if (!linkUrl) return;

    const preferences = await storage.getPreferences();
    const notify = async (title: string, message: string) => {
      if (!preferences.notificationsEnabled) return;
      try {
        await chrome.notifications.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("assets/icon.png"),
          title,
          message,
        });
      } catch (err) {
      }
    };

    try {
      const token = await getValidToken();

      if (linkUrl.startsWith("magnet:")) {
        const result = await addMagnet(token, linkUrl);
        if (preferences.autoSelectFiles) {
          await selectFiles(token, result.id, "all");
          await notify("Torrent Added", "All files selected, downloading...");
        } else {
          await notify("Torrent Added", "Select files in dashboard to start download");
        }
        startPolling();
      } else {
        const result = await unrestrictLink(token, { link: linkUrl });
        if (typeof chrome.downloads?.download === "function") {
          await chrome.downloads.download({
            url: result.download,
            filename: result.filename,
          });
        } else {
          await chrome.tabs.create({ url: result.download });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await notify("Real-Debrid Error", msg);
    }
  });
} catch (err) {
}

chrome.runtime.onInstalled.addListener(async () => {
  registerContextMenus();
  await initializePolling();
});

chrome.runtime.onStartup.addListener(async () => {
  await initializePolling();
});

initializePolling();

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabLinks(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    clearTabLinks(tabId);
    try {
      await chrome.action.setBadgeText({ text: "", tabId });
    } catch (err) {
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateBadgeForTab(activeInfo.tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_OAUTH") {
    startOAuthFlow()
      .then((deviceCode) => {
        sendResponse({ deviceCode });
      })
      .catch((err) => {
        sendResponse({ error: err.message || "Failed to start OAuth flow" });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === "CHECK_OAUTH_STATUS") {
    const state = getOAuthFlowState();
    sendResponse({ status: state.status, error: state.error });
    return false;
  }

  if (message.type === "CANCEL_OAUTH") {
    cancelOAuthFlow();
    sendResponse({ success: true });
    return false;
  }

  return false;
});
