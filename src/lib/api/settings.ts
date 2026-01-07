/**
 * Real-Debrid Settings API endpoints
 */

import { post } from "./client";

/**
 * Convert fidelity points to premium time
 * POST /settings/convertPoints
 *
 * @param token - API token
 * @returns void on success
 */
export async function convertPoints(token: string): Promise<void> {
  await post<void, Record<string, never>>("/settings/convertPoints", {}, token);
}
