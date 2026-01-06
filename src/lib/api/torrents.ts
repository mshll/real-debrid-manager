/**
 * Real-Debrid Torrents API endpoints
 */

import { del, get, post, put } from "./client";

/**
 * Torrent status values
 */
export type TorrentStatus =
  | "magnet_error"
  | "magnet_conversion"
  | "waiting_files_selection"
  | "queued"
  | "downloading"
  | "downloaded"
  | "error"
  | "virus"
  | "compressing"
  | "uploading"
  | "dead";

/**
 * Torrent item in list response
 */
export interface TorrentItem {
  id: string;
  filename: string;
  original_filename: string;
  hash: string;
  bytes: number;
  original_bytes: number;
  host: string;
  split: number;
  progress: number;
  status: TorrentStatus;
  added: string; // ISO date string
  files?: TorrentFile[];
  links: string[];
  ended?: string; // ISO date string
  speed?: number;
  seeders?: number;
}

/**
 * File within a torrent
 */
export interface TorrentFile {
  id: number;
  path: string;
  bytes: number;
  selected: number; // 0 or 1
}

/**
 * Detailed torrent information
 */
export interface TorrentInfo extends TorrentItem {
  files: TorrentFile[];
}

/**
 * Response from adding a magnet link
 */
export interface AddMagnetResponse {
  id: string;
  uri: string;
}

/**
 * Response from adding a torrent file
 */
export interface AddTorrentResponse {
  id: string;
  uri: string;
}

/**
 * Active torrent count response
 */
export interface ActiveCountResponse {
  nb: number;
  limit: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  offset?: number;
  page?: number;
  limit?: number;
  filter?: string;
}

/**
 * List all torrents
 * GET /torrents
 *
 * @param token - API token
 * @param params - Pagination parameters
 * @returns Array of torrent items
 */
export async function listTorrents(
  token: string,
  params?: PaginationParams
): Promise<TorrentItem[]> {
  const searchParams = new URLSearchParams();

  if (params?.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }
  if (params?.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params?.filter) {
    searchParams.set("filter", params.filter);
  }

  const query = searchParams.toString();
  const path = query ? `/torrents?${query}` : "/torrents";

  return get<TorrentItem[]>(path, token);
}

/**
 * Get torrent details with files
 * GET /torrents/info/{id}
 *
 * @param token - API token
 * @param id - Torrent ID
 * @returns Detailed torrent information
 */
export async function getTorrentInfo(
  token: string,
  id: string
): Promise<TorrentInfo> {
  return get<TorrentInfo>(`/torrents/info/${id}`, token);
}

/**
 * Add a magnet link
 * POST /torrents/addMagnet
 *
 * @param token - API token
 * @param magnet - Magnet link URI
 * @returns ID and URI for the new torrent
 */
export async function addMagnet(
  token: string,
  magnet: string
): Promise<AddMagnetResponse> {
  return post<AddMagnetResponse, { magnet: string }>(
    "/torrents/addMagnet",
    { magnet },
    token
  );
}

/**
 * Upload a .torrent file
 * PUT /torrents/addTorrent
 *
 * @param token - API token
 * @param file - Torrent file as Blob or ArrayBuffer
 * @returns ID and URI for the new torrent
 */
export async function addTorrent(
  token: string,
  file: Blob | ArrayBuffer
): Promise<AddTorrentResponse> {
  const formData = new FormData();
  const blob = file instanceof Blob ? file : new Blob([file]);
  formData.append("file", blob, "torrent.torrent");

  return put<AddTorrentResponse, FormData>(
    "/torrents/addTorrent",
    formData,
    token
  );
}

/**
 * Select files to download from a torrent
 * POST /torrents/selectFiles/{id}
 *
 * @param token - API token
 * @param id - Torrent ID
 * @param files - Comma-separated file IDs or "all"
 */
export async function selectFiles(
  token: string,
  id: string,
  files: string | number[]
): Promise<void> {
  const fileIds = Array.isArray(files) ? files.join(",") : files;
  await post<void, { files: string }>(
    `/torrents/selectFiles/${id}`,
    { files: fileIds },
    token
  );
}

/**
 * Delete a torrent
 * DELETE /torrents/delete/{id}
 *
 * @param token - API token
 * @param id - Torrent ID
 */
export async function deleteTorrent(token: string, id: string): Promise<void> {
  await del<void>(`/torrents/delete/${id}`, token);
}

/**
 * Get count of active torrents
 * GET /torrents/activeCount
 *
 * @param token - API token
 * @returns Active count and limit
 */
export async function getActiveCount(
  token: string
): Promise<ActiveCountResponse> {
  return get<ActiveCountResponse>("/torrents/activeCount", token);
}
