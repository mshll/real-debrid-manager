import { describe, expect, it } from "vitest";

import { formatBytes, hostUsage } from "../format";

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

describe("hostUsage", () => {
  const host = { bytes: 0, links: 0, extra: 0, reset: "daily" as const };

  it("reads gigabyte limits in GB and what's left in bytes", () => {
    const usage = hostUsage({ ...host, type: "gigabytes", limit: 25, left: 5 * 1024 ** 3 });
    expect(usage.text).toBe("5.00 GB of 25.0 GB left");
    expect(usage.used).toBeCloseTo(80);
  });

  it("counts link limits", () => {
    const usage = hostUsage({ ...host, type: "links", limit: 20, left: 18 });
    expect(usage.text).toBe("18 of 20 links left");
    expect(usage.used).toBeCloseTo(10);
  });

  it("treats byte limits as bytes", () => {
    expect(hostUsage({ ...host, type: "bytes", limit: 100 * 1024 ** 3, left: 25 * 1024 ** 3 }).used).toBeCloseTo(75);
  });
});
