export type LinkKind = "magnet" | "hoster" | "folder" | "torrent" | "container";

export interface ParsedLink {
  kind: LinkKind;
  url: string;
  hash?: string;
  name?: string;
}

export interface HostMatchers {
  hosts: RegExp[];
  folders: RegExp[];
}

const HEX_HASH = /^[a-f0-9]{40}$/i;
const BASE32_HASH = /^[a-z2-7]{32}$/i;
const MAGNET_IN_TEXT = /magnet:\?[^\s"'<>]+/gi;
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+/gi;
const BARE_HASH_IN_TEXT = /\b[a-f0-9]{40}\b/gi;

/** RD serves patterns as PHP-style "/.../" literals without flags. */
export function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map((pattern) => new RegExp(pattern.replace(/^\/|\/$/g, ""), "i"));
}

export function magnetHash(magnet: string): string | null {
  const match = /xt=urn:btih:([a-z0-9]+)/i.exec(magnet);
  const hash = match?.[1];
  if (!hash) return null;
  if (HEX_HASH.test(hash)) return hash.toLowerCase();
  if (BASE32_HASH.test(hash)) return base32ToHex(hash);
  return null;
}

export function magnetName(magnet: string): string | undefined {
  const match = /[?&]dn=([^&]+)/.exec(magnet);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return match[1];
  }
}

export function hashToMagnet(hash: string): string {
  return `magnet:?xt=urn:btih:${hash.toLowerCase()}`;
}

export function classify(raw: string, matchers: HostMatchers | null): ParsedLink | null {
  const url = raw.trim();
  if (/^magnet:\?/i.test(url)) {
    const hash = magnetHash(url);
    return hash ? { kind: "magnet", url, hash, name: magnetName(url) } : null;
  }
  if (HEX_HASH.test(url) || BASE32_HASH.test(url)) {
    const hash = HEX_HASH.test(url) ? url.toLowerCase() : base32ToHex(url);
    return { kind: "magnet", url: hashToMagnet(hash), hash };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const path = parsed.pathname.toLowerCase();
  const name = decodeSafe(parsed.pathname.split("/").pop() ?? "") || undefined;
  if (path.endsWith(".torrent")) return { kind: "torrent", url, name };
  if (/\.(dlc|ccf|ccf3|rsdf)$/.test(path)) return { kind: "container", url, name };
  if (matchers?.folders.some((re) => re.test(url))) return { kind: "folder", url };
  if (matchers?.hosts.some((re) => re.test(url))) return { kind: "hoster", url, name };
  return null;
}

/**
 * Pulls every supported link out of free text. Bare info hashes are only
 * trusted when the user typed or selected them; on arbitrary pages 40-char
 * hex strings are usually commit SHAs.
 */
export function extractLinks(
  text: string,
  matchers: HostMatchers | null,
  { bareHashes = false }: { bareHashes?: boolean } = {},
): ParsedLink[] {
  const candidates = [...(text.match(MAGNET_IN_TEXT) ?? []), ...(text.match(URL_IN_TEXT) ?? [])];
  if (bareHashes) {
    const withoutUrls = text.replace(MAGNET_IN_TEXT, " ").replace(URL_IN_TEXT, " ");
    candidates.push(...(withoutUrls.match(BARE_HASH_IN_TEXT) ?? []));
  }
  return dedupeLinks(candidates.map((candidate) => classify(trimPunctuation(candidate), matchers)));
}

export function dedupeLinks(links: (ParsedLink | null)[]): ParsedLink[] {
  const seen = new Set<string>();
  const result: ParsedLink[] = [];
  for (const link of links) {
    if (!link) continue;
    const key = link.hash ?? link.url;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(link);
  }
  return result;
}

function trimPunctuation(url: string): string {
  return url.replace(/[).,;\]]+$/, "");
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function base32ToHex(input: string): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = "";
  for (const char of input.toLowerCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  let hex = "";
  for (let i = 0; i + 4 <= bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}
