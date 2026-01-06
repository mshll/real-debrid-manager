/**
 * Real-Debrid Hosts API endpoints
 * Note: These endpoints do not require authentication
 */

import { get } from "./client";

/**
 * Get regex patterns for supported links
 * GET /hosts/regex
 *
 * These patterns can be used to detect links that Real-Debrid supports.
 * No authentication required.
 *
 * @returns Array of regex pattern strings
 */
export async function getHostsRegex(): Promise<string[]> {
  return get<string[]>("/hosts/regex", undefined, true);
}

/**
 * Get all supported domains
 * GET /hosts/domains
 *
 * Returns a list of all domains that Real-Debrid supports.
 * No authentication required.
 *
 * @returns Array of domain strings
 */
export async function getHostsDomains(): Promise<string[]> {
  return get<string[]>("/hosts/domains", undefined, true);
}

/**
 * Host information from /hosts endpoint
 */
export interface HostInfo {
  id: string;
  name: string;
  image: string;
  image_big: string;
  supported: number;
  status: string;
  check_time: string;
  competitors_status?: Record<string, { status: string; check_time: string }>;
}

/**
 * Get all supported hosts with status
 * GET /hosts
 *
 * No authentication required.
 *
 * @returns Record of host ID to host information
 */
export async function getHosts(): Promise<Record<string, HostInfo>> {
  return get<Record<string, HostInfo>>("/hosts", undefined, true);
}
