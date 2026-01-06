/**
 * Content Script: Link Scanner
 *
 * Scans the current page for supported hoster links and magnet links.
 * Triggered on-demand via messages from the popup.
 */

import type { PlasmoCSConfig } from "plasmo";
import { success, error, type Message, type DetectedLink } from "~lib/messaging";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
};

/**
 * Cache for hosts regex patterns
 */
let cachedHostsRegex: RegExp[] | null = null;
let cachedHostsRegexTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch hosts regex from background script
 */
async function getHostsRegex(): Promise<RegExp[]> {
  const now = Date.now();
  if (cachedHostsRegex && now - cachedHostsRegexTimestamp < CACHE_TTL) {
    return cachedHostsRegex;
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "GET_HOSTS_REGEX", payload: undefined },
      (response) => {
        if (chrome.runtime.lastError || !response?.success || !response?.data) {
          // Return empty array on error
          resolve([]);
          return;
        }

        try {
          // Convert string patterns to RegExp objects
          // API returns patterns wrapped in /pattern/ format, strip the delimiters
          cachedHostsRegex = response.data.map((pattern: string) => {
            // Strip leading and trailing / if present
            const stripped = pattern.startsWith("/") && pattern.endsWith("/")
              ? pattern.slice(1, -1)
              : pattern;
            return new RegExp(stripped, "i");
          });
          cachedHostsRegexTimestamp = now;
          resolve(cachedHostsRegex);
        } catch {
          // If regex compilation fails, return empty array
          resolve([]);
        }
      }
    );
  });
}

/**
 * Extract hostname from URL for display
 */
function extractHost(url: string): string {
  try {
    if (url.startsWith("magnet:")) {
      return "magnet";
    }
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Check if a URL matches any supported hoster pattern
 */
function matchesHosterPattern(url: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Scan the page for all links
 */
async function scanPageForLinks(): Promise<DetectedLink[]> {
  const detectedLinks: DetectedLink[] = [];
  const seenUrls = new Set<string>();

  // Get hoster patterns
  const hostsRegex = await getHostsRegex();

  // Find all anchor elements
  const anchors = document.querySelectorAll("a[href]");

  for (const anchor of anchors) {
    const href = (anchor as HTMLAnchorElement).href;

    // Skip empty or javascript: URLs
    if (!href || href.startsWith("javascript:") || seenUrls.has(href)) {
      continue;
    }

    seenUrls.add(href);

    // Check for magnet links
    if (href.startsWith("magnet:")) {
      detectedLinks.push({
        url: href,
        host: "magnet",
        type: "magnet",
      });
      continue;
    }

    // Check for supported hoster links
    if (matchesHosterPattern(href, hostsRegex)) {
      detectedLinks.push({
        url: href,
        host: extractHost(href),
        type: "hoster",
      });
    }
  }

  return detectedLinks;
}

/**
 * Message listener for scan requests
 */
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message.type === "SCAN_PAGE_LINKS") {
      scanPageForLinks()
        .then((links) => {
          sendResponse(success(links));
        })
        .catch((err) => {
          sendResponse(
            error(err instanceof Error ? err.message : "Failed to scan page")
          );
        });

      // Return true to indicate async response
      return true;
    }

    return false;
  }
);

/**
 * Check if auto-scan is enabled from preferences
 */
async function isAutoScanEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("preferences", (result) => {
      const prefs = result.preferences || {};
      resolve(prefs.autoScanEnabled === true);
    });
  });
}

/**
 * Report detected links to background script
 */
function reportLinksToBackground(links: DetectedLink[]): void {
  chrome.runtime.sendMessage(
    { type: "REPORT_DETECTED_LINKS", payload: { links } },
    () => {
      // Ignore errors - background might not be ready
      if (chrome.runtime.lastError) {
        // Suppress error
      }
    }
  );
}

/**
 * Perform auto-scan and report results to background
 */
async function performAutoScan(): Promise<void> {
  try {
    const links = await scanPageForLinks();
    reportLinksToBackground(links);
  } catch (err) {
    console.error("[Real-Debrid] Auto-scan failed:", err);
  }
}

/**
 * Initialize auto-scan on page load
 */
async function initAutoScan(): Promise<void> {
  const enabled = await isAutoScanEnabled();
  if (!enabled) return;

  // Page is already at document_idle, so we can scan immediately
  performAutoScan();
}

/**
 * Listen for preference changes to react to auto-scan toggle
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.preferences) {
    const oldPrefs = changes.preferences.oldValue || {};
    const newPrefs = changes.preferences.newValue || {};

    // If auto-scan was just enabled, perform a scan
    if (!oldPrefs.autoScanEnabled && newPrefs.autoScanEnabled) {
      performAutoScan();
    }
  }
});

// Initialize auto-scan when content script loads
initAutoScan();
