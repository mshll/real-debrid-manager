/**
 * Real-Debrid Downloads API endpoints
 */

import { del, get } from "./client";

/**
 * Download history item
 */
export interface DownloadItem {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  host_icon: string;
  chunks: number;
  download: string;
  streamable: number;
  generated: string; // ISO date string
  type?: string;
}

/**
 * Pagination parameters for downloads
 */
export interface DownloadsPaginationParams {
  offset?: number;
  page?: number;
  limit?: number;
}

/**
 * List download history
 * GET /downloads
 *
 * @param token - API token
 * @param params - Pagination parameters
 * @returns Array of download items
 */
export async function listDownloads(
  token: string,
  params?: DownloadsPaginationParams
): Promise<DownloadItem[]> {
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

  const query = searchParams.toString();
  const path = query ? `/downloads?${query}` : "/downloads";

  return get<DownloadItem[]>(path, token);
}

/**
 * Delete a download from history
 * DELETE /downloads/delete/{id}
 *
 * @param token - API token
 * @param id - Download ID
 */
export async function deleteDownload(token: string, id: string): Promise<void> {
  await del<void>(`/downloads/delete/${id}`, token);
}
