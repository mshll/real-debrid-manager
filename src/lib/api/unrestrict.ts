/**
 * Real-Debrid Unrestrict API endpoints
 */

import { post, put } from "./client";

/**
 * Result from checking a link before unrestricting
 */
export interface LinkCheckResult {
  host: string;
  host_icon: string;
  link: string;
  filename: string;
  filesize: number;
  supported: number; // 0 = not supported, 1 = supported
}

/**
 * Request body for unrestricting a link
 */
export interface UnrestrictLinkRequest {
  link: string;
  password?: string;
  remote?: number; // 0 or 1
}

/**
 * Response from unrestricting a link
 */
export interface UnrestrictedLink {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  host_icon: string;
  chunks: number;
  crc: number;
  download: string;
  streamable: number;
}

/**
 * Request body for unrestricting a folder
 */
export interface UnrestrictFolderRequest {
  link: string;
}

/**
 * Unrestrict a download link
 * POST /unrestrict/link
 *
 * @param token - API token
 * @param params - Link to unrestrict with optional password and remote flag
 * @returns Unrestricted link information
 */
export async function unrestrictLink(
  token: string,
  params: UnrestrictLinkRequest
): Promise<UnrestrictedLink> {
  return post<UnrestrictedLink, UnrestrictLinkRequest>(
    "/unrestrict/link",
    params,
    token
  );
}

/**
 * Unrestrict a folder link
 * POST /unrestrict/folder
 *
 * @param token - API token
 * @param link - Folder link to unrestrict
 * @returns Array of unrestricted links
 */
export async function unrestrictFolder(
  token: string,
  link: string
): Promise<string[]> {
  return post<string[], UnrestrictFolderRequest>(
    "/unrestrict/folder",
    { link },
    token
  );
}

/**
 * Check if a link is downloadable before unrestricting
 * POST /unrestrict/check
 *
 * @param token - API token
 * @param link - Link to check
 * @returns Link check result with file info and support status
 */
export async function checkLink(
  token: string,
  link: string
): Promise<LinkCheckResult> {
  return post<LinkCheckResult, { link: string }>(
    "/unrestrict/check",
    { link },
    token
  );
}

/**
 * Decrypt a container file (RSDF, CCF, CCF3, DLC)
 * PUT /unrestrict/containerFile
 *
 * @param token - API token
 * @param fileData - Container file data as ArrayBuffer
 * @returns Array of links extracted from the container
 */
export async function decryptContainerFile(
  token: string,
  fileData: ArrayBuffer
): Promise<string[]> {
  const formData = new FormData();
  formData.append("file", new Blob([fileData]));

  return put<string[], FormData>("/unrestrict/containerFile", formData, token);
}

/**
 * Decrypt a container from URL
 * POST /unrestrict/containerLink
 *
 * @param token - API token
 * @param link - URL to the container file
 * @returns Array of links extracted from the container
 */
export async function decryptContainerLink(
  token: string,
  link: string
): Promise<string[]> {
  return post<string[], { link: string }>(
    "/unrestrict/containerLink",
    { link },
    token
  );
}
