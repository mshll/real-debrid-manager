/**
 * Type-safe storage wrapper using @plasmohq/storage
 * Provides cross-context state sync and reactive updates
 */

import { Storage } from "@plasmohq/storage";

import type { UserProfile } from "./api/user";
import type { AuthData } from "./auth";

// Storage instances for different purposes
// Use local storage for auth (more reliable than sync)
export const authStorage = new Storage({ area: "local" });
// Use sync storage for preferences (shared across devices)
export const syncStorage = new Storage({ area: "sync" });
// Use local storage for cache
export const cacheStorage = new Storage({ area: "local" });

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  AUTH_DATA: "authData",
  PREFERENCES: "preferences",
  CACHE: "cache",
} as const;

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
 * Default preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
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
 * Storage wrapper with type safety using @plasmohq/storage
 */
export const storage = {
  // ============================================
  // AUTH DATA (local storage - more reliable)
  // ============================================

  /**
   * Get the full auth data
   */
  async getAuthData(): Promise<AuthData | null> {
    const data = await authStorage.get<AuthData>(STORAGE_KEYS.AUTH_DATA);
    return data ?? null;
  },

  /**
   * Set the full auth data
   */
  async setAuthData(authData: AuthData): Promise<void> {
    await authStorage.set(STORAGE_KEYS.AUTH_DATA, authData);
  },

  /**
   * Remove all auth data (full logout)
   */
  async removeAuthData(): Promise<void> {
    await authStorage.remove(STORAGE_KEYS.AUTH_DATA);
    await this.clearCache();
  },

  /**
   * Get the API token from auth data
   */
  async getToken(): Promise<string | null> {
    const authData = await this.getAuthData();
    return authData?.accessToken ?? null;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const authData = await this.getAuthData();
    return authData !== null && !!authData.accessToken;
  },

  // ============================================
  // PREFERENCES (sync storage)
  // ============================================

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const prefs = await syncStorage.get<UserPreferences>(
      STORAGE_KEYS.PREFERENCES
    );
    return { ...DEFAULT_PREFERENCES, ...prefs };
  },

  /**
   * Update user preferences (partial update)
   */
  async setPreferences(
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };
    await syncStorage.set(STORAGE_KEYS.PREFERENCES, updated);
    return updated;
  },

  // ============================================
  // CACHE (local storage)
  // ============================================

  /**
   * Get cached data
   */
  async getCache(): Promise<CachedData> {
    const cache = await cacheStorage.get<CachedData>(STORAGE_KEYS.CACHE);
    return cache ?? {};
  },

  /**
   * Update cached data (partial update)
   */
  async setCache(updates: Partial<CachedData>): Promise<void> {
    const current = await this.getCache();
    await cacheStorage.set(STORAGE_KEYS.CACHE, { ...current, ...updates });
  },

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await cacheStorage.remove(STORAGE_KEYS.CACHE);
  },

  // ============================================
  // CACHED PROFILE
  // ============================================

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

  async cacheUserProfile(profile: UserProfile): Promise<void> {
    await this.setCache({
      userProfile: profile,
      userProfileTimestamp: Date.now(),
    });
  },

  async clearUserProfileCache(): Promise<void> {
    await this.setCache({
      userProfile: undefined,
      userProfileTimestamp: undefined,
    });
  },

  // ============================================
  // CACHED DOMAINS/HOSTS
  // ============================================

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

  async cacheDomains(domains: string[]): Promise<void> {
    await this.setCache({
      supportedDomains: domains,
      supportedDomainsTimestamp: Date.now(),
    });
  },

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

  async cacheHostsRegex(patterns: string[]): Promise<void> {
    await this.setCache({
      hostsRegex: patterns,
      hostsRegexTimestamp: Date.now(),
    });
  },

  // ============================================
  // WATCH FUNCTIONALITY (for cross-context sync)
  // ============================================

  /**
   * Watch for auth data changes
   * Note: For React components, prefer using the useStorage hook instead
   */
  watchAuthData(callback: (authData: AuthData | null) => void): void {
    authStorage.watch({
      [STORAGE_KEYS.AUTH_DATA]: (change) => {
        callback(change.newValue ?? null);
      },
    });
  },

  /**
   * Watch for preference changes
   * Note: For React components, prefer using the useStorage hook instead
   */
  watchPreferences(callback: (prefs: UserPreferences) => void): void {
    syncStorage.watch({
      [STORAGE_KEYS.PREFERENCES]: (change) => {
        callback({ ...DEFAULT_PREFERENCES, ...change.newValue });
      },
    });
  },
};

export default storage;
