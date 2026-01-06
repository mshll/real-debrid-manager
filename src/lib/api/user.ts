/**
 * Real-Debrid User API endpoints
 */

import { get } from "./client";

/**
 * User profile information
 */
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: "premium" | "free";
  premium: number; // Unix timestamp of premium expiration
  expiration: string; // ISO date string
}

/**
 * User settings
 */
export interface UserSettings {
  download_ports: string[];
  streaming_quality: string;
  streaming_language_preference: string;
  streaming_cast_audio_preference: string;
  locales: Record<string, string>;
  quality_preference: string;
}

/**
 * Get current user profile
 * GET /user
 */
export async function getUser(token: string): Promise<UserProfile> {
  return get<UserProfile>("/user", token);
}

/**
 * Get current user settings
 * GET /settings
 */
export async function getSettings(token: string): Promise<UserSettings> {
  return get<UserSettings>("/settings", token);
}
