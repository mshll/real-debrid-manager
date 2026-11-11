import { compilePatterns, type HostMatchers } from "./links";
import { getHostRegex, getHostRegexFolder } from "./rd/api";
import { hostRegexItem } from "./storage";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

let compiled: { fetchedAt: number; matchers: HostMatchers } | null = null;

/** Null when the host list has never loaded; magnets and hashes still classify without it. */
export async function getHostMatchers(): Promise<HostMatchers | null> {
  let cached = await hostRegexItem.getValue();
  if (!cached || Date.now() - cached.fetchedAt > MAX_AGE_MS) {
    try {
      const [patterns, folders] = await Promise.all([getHostRegex(), getHostRegexFolder()]);
      cached = { patterns, folders, fetchedAt: Date.now() };
      await hostRegexItem.setValue(cached);
    } catch (error) {
      console.warn("Host list refresh failed", error);
      if (!cached) return null;
    }
  }
  if (compiled?.fetchedAt !== cached.fetchedAt) {
    compiled = {
      fetchedAt: cached.fetchedAt,
      matchers: { hosts: compilePatterns(cached.patterns), folders: compilePatterns(cached.folders) },
    };
  }
  return compiled.matchers;
}
