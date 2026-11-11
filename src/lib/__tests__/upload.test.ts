import { describe, expect, it } from "vitest";

import { fromBase64, toBase64 } from "../upload";

describe("torrent upload encoding", () => {
  it("round-trips every byte value", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(fromBase64(toBase64(bytes.buffer))).toEqual(bytes);
  });

  it("round-trips files larger than one encoding chunk", () => {
    const bytes = Uint8Array.from({ length: 0x8000 * 2 + 17 }, (_, i) => (i * 31) % 256);
    expect(fromBase64(toBase64(bytes.buffer))).toEqual(bytes);
  });
});
