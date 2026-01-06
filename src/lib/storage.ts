/**
 * Type-safe Chrome storage wrapper for Real-Debrid extension
 */

import type { UserProfile } from "./api/user";
import type { AuthData } from "./auth";

/**
 * User preferences stored in sync storage
 */
export interface UserPreferences {
  notificationsEnabled: boolean;
  autoUnrestrict: boolean;
  autoSelectFiles: boolean;
  autoScanEnabled: boolean;
  downloadDirectory?: string;
  theme: "light" | "dark" | "system";
}

/**
 * Cached data stored in local storage
 */
export interface CachedData {
  userProfile?: UserProfile;
  userProfileTimestamp?: number;
  supportedDomains?: string[];
  supportedDomainsTimestamp?: number;
  hostsRegex?: string[];
  hostsRegexTimestamp?: number;
}

/**
 * All storage keys and their types
 */
export interface StorageSchema {
  // Sync storage (shared across devices)
  apiToken: string;
  authData: AuthData;
  preferences: UserPreferences;

  // Local storage (device-specific cache)
  cache: CachedData;
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  autoUnrestrict: false,
  autoSelectFiles: true,
  autoScanEnabled: false,
  theme: "system",
};

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Storage wrapper with type safety
 */
export const storage = {
  /**
   * Get the API token
   */
  async getToken(): Promise<string | null> {
    const result = await chrome.storage.sync.get("apiToken");
    return result.apiToken ?? null;
  },

  /**
   * Set the API token
   */
  async setToken(token: string): Promise<void> {
    await chrome.storage.sync.set({ apiToken: token });
  },

  /**
   * Remove the API token (logout)
   */
  async removeToken(): Promise<void> {
    await chrome.storage.sync.remove("apiToken");
    // Also clear cached user data
    await this.clearCache();
  },

  /**
   * Get the full auth data (including refresh token and credentials)
   */
  async getAuthData(): Promise<AuthData | null> {
    const result = await chrome.storage.sync.get("authData");
    return result.authData ?? null;
  },

  /**
   * Set the full auth data
   */
  async setAuthData(authData: AuthData): Promise<void> {
    await chrome.storage.sync.set({ authData });
    // Also set the access token for backwards compatibility
    await this.setToken(authData.accessToken);
  },

  /**
   * Remove all auth data (full logout)
   */
  async removeAuthData(): Promise<void> {
    await chrome.storage.sync.remove(["apiToken", "authData"]);
    await this.clearCache();
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.length > 0;
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const result = await chrome.storage.sync.get("preferences");
    return { ...DEFAULT_PREFERENCES, ...result.preferences };
  },

  /**
   * Update user preferences (partial update)
   */
  async setPreferences(
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };
    await chrome.storage.sync.set({ preferences: updated });
    return updated;
  },

  /**
   * Get cached data
   */
  async getCache(): Promise<CachedData> {
    const result = await chrome.storage.local.get("cache");
    return result.cache ?? {};
  },

  /**
   * Update cached data (partial update)
   */
  async setCache(updates: Partial<CachedData>): Promise<void> {
    const current = await this.getCache();
    await chrome.storage.local.set({ cache: { ...current, ...updates } });
  },

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await chrome.storage.local.remove("cache");
  },

  /**
   * Get cached user profile if still valid
   */
  async getCachedUserProfile(): Promise<UserProfile | null> {
    const cache = await this.getCache();
    if (
      cache.userProfile &&
      cache.userProfileTimestamp &&
      Date.now() - cache.userProfileTimestamp < CACHE_TTL
    ) {
      return cache.userProfile;
    }
    return null;
  },

  /**
   * Cache user profile
   */
  async cacheUserProfile(profile: UserProfile): Promise<void> {
    await this.setCache({
      userProfile: profile,
      userProfileTimestamp: Date.now(),
    });
  },

  /**
   * Get cached supported domains if still valid
   */
  async getCachedDomains(): Promise<string[] | null> {
    const cache = await this.getCache();
    if (
      cache.supportedDomains &&
      cache.supportedDomainsTimestamp &&
      Date.now() - cache.supportedDomainsTimestamp < CACHE_TTL
    ) {
      return cache.supportedDomains;
    }
    return null;
  },

  /**
   * Cache supported domains
   */
  async cacheDomains(domains: string[]): Promise<void> {
    await this.setCache({
      supportedDomains: domains,
      supportedDomainsTimestamp: Date.now(),
    });
  },

  /**
   * Get cached hosts regex patterns if still valid
   */
  async getCachedHostsRegex(): Promise<string[] | null> {
    const cache = await this.getCache();
    if (
      cache.hostsRegex &&
      cache.hostsRegexTimestamp &&
      Date.now() - cache.hostsRegexTimestamp < CACHE_TTL
    ) {
      return cache.hostsRegex;
    }
    return null;
  },

  /**
   * Cache hosts regex patterns
   */
  async cacheHostsRegex(patterns: string[]): Promise<void> {
    await this.setCache({
      hostsRegex: patterns,
      hostsRegexTimestamp: Date.now(),
    });
  },

  /**
   * Listen for storage changes
   */
  onChanged(
    callback: (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => void
  ): void {
    chrome.storage.onChanged.addListener(callback);
  },

  /**
   * Remove storage change listener
   */
  offChanged(
    callback: (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => void
  ): void {
    chrome.storage.onChanged.removeListener(callback);
  },
};

export default storage;
