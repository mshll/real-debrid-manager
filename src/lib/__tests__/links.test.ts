import { describe, expect, it } from "vitest";

import { classify, compilePatterns, extractLinks, magnetHash } from "../links";

const matchers = {
  hosts: compilePatterns([
    "/(http|https):\\/\\/(\\w+\\.)?1fichier\\.com\\/\\?([^( |\"|'|>|<|\\r\\n\\|\\r|\\n|:|$)]+)/",
  ]),
  folders: compilePatterns([
    "/(http|https):\\/\\/(\\w+\\.)?1fichier\\.com\\/dir\\/([^( |\"|'|>|<|\\r\\n\\|\\r|\\n|:|$)]+)/",
  ]),
};
const HEX = "c9e15763f722f23e98a29decdfae341b98d53056";

describe("magnetHash", () => {
  it("normalizes hex to lowercase", () => {
    expect(magnetHash(`magnet:?xt=urn:btih:${HEX.toUpperCase()}&dn=x`)).toBe(HEX);
  });

  it("converts base32 hashes to hex", () => {
    expect(magnetHash("magnet:?xt=urn:btih:ZHQVOY7XELZD5GFCTXWN7LRUDOMNKMCW")).toBe(HEX);
  });

  it("rejects malformed hashes", () => {
    expect(magnetHash("magnet:?xt=urn:btih:abc")).toBeNull();
  });
});

describe("classify", () => {
  it("reads magnet names", () => {
    expect(classify(`magnet:?xt=urn:btih:${HEX}&dn=Big+Buck%20Bunny`, null)).toMatchObject({
      kind: "magnet",
      hash: HEX,
      name: "Big Buck Bunny",
    });
  });

  it("turns bare hashes into magnets", () => {
    expect(classify(HEX, null)).toMatchObject({ kind: "magnet", url: `magnet:?xt=urn:btih:${HEX}` });
  });

  it("detects torrent files, containers, folders and hosters", () => {
    expect(classify("https://site.org/files/show.torrent?x=1", matchers)?.kind).toBe("torrent");
    expect(classify("https://site.org/pack.dlc", matchers)?.kind).toBe("container");
    expect(classify("https://1fichier.com/dir/abc", matchers)?.kind).toBe("folder");
    expect(classify("https://1fichier.com/?abc123", matchers)?.kind).toBe("hoster");
  });

  it("ignores unsupported links", () => {
    expect(classify("https://example.com/page", matchers)).toBeNull();
    expect(classify("ftp://1fichier.com/?abc", matchers)).toBeNull();
  });
});

describe("extractLinks", () => {
  const text = `Grab https://1fichier.com/?abc123, or magnet:?xt=urn:btih:${HEX}&dn=a and again magnet:?xt=urn:btih:${HEX.toUpperCase()}. commit ${"a".repeat(40)}`;

  it("dedupes magnets by hash and trims trailing punctuation", () => {
    const links = extractLinks(text, matchers);
    expect(links.map((link) => link.kind)).toEqual(["magnet", "hoster"]);
    expect(links[1]?.url).toBe("https://1fichier.com/?abc123");
  });

  it("only picks up bare hashes when asked", () => {
    expect(extractLinks(text, matchers, { bareHashes: true })).toHaveLength(3);
  });
});
