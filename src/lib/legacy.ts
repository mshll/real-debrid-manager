import { browser } from "wxt/browser";

import { authItem, type Auth } from "./storage";

/** v1 (Plasmo) kept the sign-in under this key, JSON-encoded. */
const LEGACY_AUTH_KEY = "authData";

/** Carries a v1 sign-in over on update, so store users aren't signed out. */
export async function migrateLegacyAuth(): Promise<void> {
  const { [LEGACY_AUTH_KEY]: raw } = await browser.storage.local.get(LEGACY_AUTH_KEY);
  if (raw === undefined) return;
  const auth = fromLegacyAuth(raw);
  if (auth && !(await authItem.getValue())) await authItem.setValue(auth);
  await browser.storage.local.remove(LEGACY_AUTH_KEY);
}

export function fromLegacyAuth(raw: unknown): Auth | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      console.warn("Unreadable v1 sign-in", error);
      return null;
    }
  }
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  const text = (key: string): string => (typeof data[key] === "string" ? data[key] : "");
  const accessToken = text("accessToken");
  if (!accessToken) return null;
  const [clientId, clientSecret, refreshToken] = [text("clientId"), text("clientSecret"), text("refreshToken")];
  if (!clientId || !clientSecret || !refreshToken) return { kind: "token", accessToken };
  const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : 0;
  return { kind: "oauth", clientId, clientSecret, accessToken, refreshToken, expiresAt };
}
