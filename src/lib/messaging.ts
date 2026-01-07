/**
 * Type-safe messaging between background script and popup/content scripts
 */

import type { DownloadItem } from "./api/downloads";
import type { HostInfo } from "./api/hosts";
import type { TranscodeQuality, MediaInfo } from "./api/streaming";
import type { TrafficInfo, TrafficDetails } from "./api/traffic";
import type { TorrentItem, TorrentInfo, AddMagnetResponse } from "./api/torrents";
import type { UnrestrictedLink, LinkCheckResult } from "./api/unrestrict";
import type { UserProfile } from "./api/user";

/**
 * Detected link from page scanning
 */
export interface DetectedLink {
  url: string;
  host: string;
  type: "hoster" | "magnet";
}

/**
 * Message types for different operations
 */
export type MessageType =
  // Auth
  | "AUTH_STATUS"
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  // User
  | "GET_USER_PROFILE"
  | "GET_USER_SETTINGS"
  | "CONVERT_POINTS"
  // Unrestrict
  | "UNRESTRICT_LINK"
  | "UNRESTRICT_FOLDER"
  | "CHECK_LINK"
  | "DECRYPT_CONTAINER_FILE"
  | "DECRYPT_CONTAINER_LINK"
  // Streaming
  | "GET_TRANSCODE_LINKS"
  | "GET_MEDIA_INFO"
  // Torrents
  | "LIST_TORRENTS"
  | "GET_TORRENT_INFO"
  | "ADD_MAGNET"
  | "ADD_TORRENT"
  | "SELECT_TORRENT_FILES"
  | "DELETE_TORRENT"
  | "GET_ACTIVE_TORRENT_COUNT"
  // Downloads
  | "LIST_DOWNLOADS"
  | "DELETE_DOWNLOAD"
  // Hosts
  | "GET_HOSTS_REGEX"
  | "GET_HOSTS_DOMAINS"
  | "GET_HOSTS_STATUS"
  // Traffic
  | "GET_TRAFFIC"
  | "GET_TRAFFIC_DETAILS"
  // Notifications
  | "SHOW_NOTIFICATION"
  // Content Script
  | "SCAN_PAGE_LINKS"
  // Auto-scan
  | "REPORT_DETECTED_LINKS"
  | "GET_DETECTED_LINKS";

/**
 * Base message structure
 */
interface BaseMessage<T extends MessageType, P = undefined> {
  type: T;
  payload: P;
}

/**
 * Message definitions
 */
export type Message =
  // Auth messages
  | BaseMessage<"AUTH_STATUS">
  | BaseMessage<"AUTH_LOGIN", { token: string }>
  | BaseMessage<"AUTH_LOGOUT">
  // User messages
  | BaseMessage<"GET_USER_PROFILE">
  | BaseMessage<"GET_USER_SETTINGS">
  | BaseMessage<"CONVERT_POINTS">
  // Unrestrict messages
  | BaseMessage<"UNRESTRICT_LINK", { link: string; password?: string; remote?: boolean }>
  | BaseMessage<"UNRESTRICT_FOLDER", { link: string }>
  | BaseMessage<"CHECK_LINK", { link: string }>
  | BaseMessage<"DECRYPT_CONTAINER_FILE", { fileData: ArrayBuffer }>
  | BaseMessage<"DECRYPT_CONTAINER_LINK", { link: string }>
  // Streaming messages
  | BaseMessage<"GET_TRANSCODE_LINKS", { id: string }>
  | BaseMessage<"GET_MEDIA_INFO", { id: string }>
  // Torrent messages
  | BaseMessage<"LIST_TORRENTS", { offset?: number; limit?: number } | undefined>
  | BaseMessage<"GET_TORRENT_INFO", { id: string }>
  | BaseMessage<"ADD_MAGNET", { magnet: string }>
  | BaseMessage<"ADD_TORRENT", { fileData: ArrayBuffer }>
  | BaseMessage<"SELECT_TORRENT_FILES", { id: string; files: string | number[] }>
  | BaseMessage<"DELETE_TORRENT", { id: string }>
  | BaseMessage<"GET_ACTIVE_TORRENT_COUNT">
  // Download messages
  | BaseMessage<"LIST_DOWNLOADS", { offset?: number; limit?: number } | undefined>
  | BaseMessage<"DELETE_DOWNLOAD", { id: string }>
  // Host messages
  | BaseMessage<"GET_HOSTS_REGEX">
  | BaseMessage<"GET_HOSTS_DOMAINS">
  | BaseMessage<"GET_HOSTS_STATUS">
  // Traffic messages
  | BaseMessage<"GET_TRAFFIC">
  | BaseMessage<"GET_TRAFFIC_DETAILS">
  // Notification messages
  | BaseMessage<"SHOW_NOTIFICATION", { title: string; message: string }>
  // Content script messages
  | BaseMessage<"SCAN_PAGE_LINKS">
  // Auto-scan messages
  | BaseMessage<"REPORT_DETECTED_LINKS", { links: DetectedLink[] }>
  | BaseMessage<"GET_DETECTED_LINKS">;

/**
 * Response types mapped to message types
 */
export interface ResponseMap {
  AUTH_STATUS: { authenticated: boolean; profile?: UserProfile };
  AUTH_LOGIN: { success: boolean; error?: string };
  AUTH_LOGOUT: { success: boolean };
  GET_USER_PROFILE: UserProfile;
  GET_USER_SETTINGS: unknown;
  CONVERT_POINTS: void;
  UNRESTRICT_LINK: UnrestrictedLink;
  UNRESTRICT_FOLDER: string[];
  CHECK_LINK: LinkCheckResult;
  DECRYPT_CONTAINER_FILE: string[];
  DECRYPT_CONTAINER_LINK: string[];
  GET_TRANSCODE_LINKS: TranscodeQuality;
  GET_MEDIA_INFO: MediaInfo;
  LIST_TORRENTS: TorrentItem[];
  GET_TORRENT_INFO: TorrentInfo;
  ADD_MAGNET: AddMagnetResponse;
  ADD_TORRENT: AddMagnetResponse;
  SELECT_TORRENT_FILES: void;
  DELETE_TORRENT: void;
  GET_ACTIVE_TORRENT_COUNT: { nb: number; limit: number };
  LIST_DOWNLOADS: DownloadItem[];
  DELETE_DOWNLOAD: void;
  GET_HOSTS_REGEX: string[];
  GET_HOSTS_DOMAINS: string[];
  GET_HOSTS_STATUS: Record<string, HostInfo>;
  GET_TRAFFIC: TrafficInfo;
  GET_TRAFFIC_DETAILS: TrafficDetails;
  SHOW_NOTIFICATION: void;
  SCAN_PAGE_LINKS: DetectedLink[];
  REPORT_DETECTED_LINKS: void;
  GET_DETECTED_LINKS: DetectedLink[];
}

/**
 * Standard response wrapper
 */
export interface MessageResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: number;
}

/**
 * Send a message to the background script
 */
export async function sendMessage<T extends MessageType>(
  message: Extract<Message, { type: T }>
): Promise<MessageResponse<ResponseMap[T]>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse<ResponseMap[T]>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message ?? "Unknown error",
        });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Type-safe message handler
 */
export type MessageHandler<T extends MessageType> = (
  payload: Extract<Message, { type: T }>["payload"],
  sender: chrome.runtime.MessageSender
) => Promise<MessageResponse<ResponseMap[T]>>;

/**
 * Registry of message handlers
 */
type HandlerRegistry = {
  [K in MessageType]?: MessageHandler<K>;
};

/**
 * Create a message listener for the background script
 */
export function createMessageListener(handlers: Partial<HandlerRegistry>): void {
  chrome.runtime.onMessage.addListener(
    (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse<unknown>) => void
    ) => {
      const handler = handlers[message.type] as MessageHandler<typeof message.type> | undefined;

      if (handler) {
        // Handle async response
        handler(message.payload as never, sender)
          .then(sendResponse)
          .catch((error: Error) => {
            sendResponse({
              success: false,
              error: error.message,
            });
          });

        // Return true to indicate async response
        return true;
      }

      // No handler found - let other listeners handle it
      return false;
    }
  );
}

/**
 * Helper to create a success response
 */
export function success<T>(data: T): MessageResponse<T> {
  return { success: true, data };
}

/**
 * Helper to create an error response
 */
export function error<T>(message: string, code?: number): MessageResponse<T> {
  return { success: false, error: message, errorCode: code };
}

/**
 * Convenience functions for common messages
 */
export const messages = {
  // Auth
  checkAuthStatus: () =>
    sendMessage({ type: "AUTH_STATUS", payload: undefined }),

  login: (token: string) =>
    sendMessage({ type: "AUTH_LOGIN", payload: { token } }),

  logout: () =>
    sendMessage({ type: "AUTH_LOGOUT", payload: undefined }),

  // User
  getUserProfile: () =>
    sendMessage({ type: "GET_USER_PROFILE", payload: undefined }),

  convertPoints: () =>
    sendMessage({ type: "CONVERT_POINTS", payload: undefined }),

  // Unrestrict
  unrestrictLink: (link: string, password?: string, remote?: boolean) =>
    sendMessage({ type: "UNRESTRICT_LINK", payload: { link, password, remote } }),

  unrestrictFolder: (link: string) =>
    sendMessage({ type: "UNRESTRICT_FOLDER", payload: { link } }),

  checkLink: (link: string) =>
    sendMessage({ type: "CHECK_LINK", payload: { link } }),

  decryptContainerFile: (fileData: ArrayBuffer) =>
    sendMessage({ type: "DECRYPT_CONTAINER_FILE", payload: { fileData } }),

  decryptContainerLink: (link: string) =>
    sendMessage({ type: "DECRYPT_CONTAINER_LINK", payload: { link } }),

  // Streaming
  getTranscodeLinks: (id: string) =>
    sendMessage({ type: "GET_TRANSCODE_LINKS", payload: { id } }),

  getMediaInfo: (id: string) =>
    sendMessage({ type: "GET_MEDIA_INFO", payload: { id } }),

  // Torrents
  listTorrents: (params?: { offset?: number; limit?: number }) =>
    sendMessage({ type: "LIST_TORRENTS", payload: params }),

  getTorrentInfo: (id: string) =>
    sendMessage({ type: "GET_TORRENT_INFO", payload: { id } }),

  addMagnet: (magnet: string) =>
    sendMessage({ type: "ADD_MAGNET", payload: { magnet } }),

  deleteTorrent: (id: string) =>
    sendMessage({ type: "DELETE_TORRENT", payload: { id } }),

  // Downloads
  listDownloads: (params?: { offset?: number; limit?: number }) =>
    sendMessage({ type: "LIST_DOWNLOADS", payload: params }),

  deleteDownload: (id: string) =>
    sendMessage({ type: "DELETE_DOWNLOAD", payload: { id } }),

  // Hosts
  getHostsRegex: () =>
    sendMessage({ type: "GET_HOSTS_REGEX", payload: undefined }),

  getHostsDomains: () =>
    sendMessage({ type: "GET_HOSTS_DOMAINS", payload: undefined }),

  getHostsStatus: () =>
    sendMessage({ type: "GET_HOSTS_STATUS", payload: undefined }),

  // Traffic
  getTraffic: () =>
    sendMessage({ type: "GET_TRAFFIC", payload: undefined }),

  getTrafficDetails: () =>
    sendMessage({ type: "GET_TRAFFIC_DETAILS", payload: undefined }),

  // Notifications
  showNotification: (title: string, message: string) =>
    sendMessage({ type: "SHOW_NOTIFICATION", payload: { title, message } }),

  // Auto-scan
  getDetectedLinks: () =>
    sendMessage({ type: "GET_DETECTED_LINKS", payload: undefined }),
};

/**
 * Send a message to a content script in a specific tab
 */
export async function sendToContentScript<T extends MessageType>(
  tabId: number,
  message: Extract<Message, { type: T }>
): Promise<MessageResponse<ResponseMap[T]>> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: MessageResponse<ResponseMap[T]>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message ?? "Unknown error",
        });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Scan the current tab's page for supported links
 */
export async function scanPageLinks(tabId: number): Promise<MessageResponse<DetectedLink[]>> {
  return sendToContentScript(tabId, { type: "SCAN_PAGE_LINKS", payload: undefined });
}

export default messages;
