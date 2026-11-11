import { describe, expect, it, vi } from "vitest";

vi.mock("wxt/browser", () => ({ browser: {} }));
vi.mock("../storage", () => ({ authItem: {} }));

const { fromLegacyAuth } = await import("../legacy");

const OAUTH = { accessToken: "a", refreshToken: "r", clientId: "c", clientSecret: "s", expiresAt: 123 };

describe("fromLegacyAuth", () => {
  it("reads a JSON-encoded v1 device sign-in", () => {
    expect(fromLegacyAuth(JSON.stringify(OAUTH))).toEqual({ kind: "oauth", ...OAUTH });
  });

  it("treats a v1 entry without client credentials as an API token", () => {
    const token = { accessToken: "t", refreshToken: "", clientId: "", clientSecret: "", expiresAt: 0 };
    expect(fromLegacyAuth(token)).toEqual({ kind: "token", accessToken: "t" });
  });

  it("drops entries with no access token or unreadable JSON", () => {
    expect(fromLegacyAuth({ ...OAUTH, accessToken: "" })).toBeNull();
    expect(fromLegacyAuth("{not json")).toBeNull();
    expect(fromLegacyAuth(null)).toBeNull();
  });
});
