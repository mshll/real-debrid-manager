import { describe, expect, it } from "vitest";

import { formatBytes } from "../format";

describe("formatBytes", () => {
  it("matches Real-Debrid's 1024-based sizes", () => {
    expect(formatBytes(2_620_000_000)).toBe("2.44 GB");
    expect(formatBytes(1_130_000_000_000)).toBe("1.03 TB");
  });

  it("drops decimals as values grow", () => {
    expect(formatBytes(62.5 * 1024 ** 3)).toBe("62.5 GB");
    expect(formatBytes(129.3 * 1024 ** 3)).toBe("129 GB");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});
