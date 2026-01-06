/**
 * Real-Debrid API Module Exports
 */

// Client utilities
export {
  getRateLimitStatus,
  RealDebridApiError,
  request,
  get,
  post,
  put,
  del,
} from "./client";

export type { ApiError, HttpMethod } from "./client";

// User API
export { getUser, getSettings } from "./user";
export type { UserProfile, UserSettings } from "./user";

// Unrestrict API
export { unrestrictLink, unrestrictFolder } from "./unrestrict";
export type {
  UnrestrictLinkRequest,
  UnrestrictedLink,
  UnrestrictFolderRequest,
} from "./unrestrict";

// Torrents API
export {
  listTorrents,
  getTorrentInfo,
  addMagnet,
  addTorrent,
  selectFiles,
  deleteTorrent,
  getActiveCount,
} from "./torrents";
export type {
  TorrentStatus,
  TorrentItem,
  TorrentFile,
  TorrentInfo,
  AddMagnetResponse,
  AddTorrentResponse,
  ActiveCountResponse,
  PaginationParams,
} from "./torrents";

// Downloads API
export { listDownloads, deleteDownload } from "./downloads";
export type { DownloadItem, DownloadsPaginationParams } from "./downloads";

// Hosts API
export { getHostsRegex, getHostsDomains, getHosts } from "./hosts";
export type { HostInfo } from "./hosts";
