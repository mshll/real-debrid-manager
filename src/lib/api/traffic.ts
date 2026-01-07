/**
 * Real-Debrid Traffic API endpoints
 */

import { get } from "./client";

/**
 * Traffic information for a host
 */
export interface HostTrafficInfo {
  left: number; // bytes remaining
  bytes: number; // bytes available
  links: number; // links available
  limit: number; // daily limit
  type: string; // "links" or "bytes"
  extra: number; // extra traffic
  reset: string; // reset date/time
}

/**
 * Traffic information for all limited hosts
 */
export type TrafficInfo = Record<string, HostTrafficInfo>;

/**
 * Daily traffic usage breakdown by host
 */
export type TrafficDetails = Record<string, Record<string, number>>;

/**
 * Get traffic information for limited hosters
 * GET /traffic
 *
 * @param token - API token
 * @returns Traffic info by host
 */
export async function getTraffic(token: string): Promise<TrafficInfo> {
  return get<TrafficInfo>("/traffic", token);
}

/**
 * Get daily traffic usage breakdown
 * GET /traffic/details
 *
 * @param token - API token
 * @returns Daily traffic usage by date and host
 */
export async function getTrafficDetails(token: string): Promise<TrafficDetails> {
  return get<TrafficDetails>("/traffic/details", token);
}
