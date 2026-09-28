import { authItem } from "../storage";
import { RdError, toRdError } from "./errors";

const OAUTH_URL = "https://api.real-debrid.com/oauth/v2";
const OPEN_SOURCE_CLIENT_ID = "X245A4XAIBGVM";
const DEVICE_GRANT = "http://oauth.net/grant_type/device/1.0";
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  directVerificationUrl: string | null;
  interval: number;
  expiresIn: number;
}

export async function requestDeviceCode(): Promise<DeviceCode> {
  const res = await fetch(`${OAUTH_URL}/device/code?client_id=${OPEN_SOURCE_CLIENT_ID}&new_credentials=yes`);
  if (!res.ok) throw await toRdError(res);
  const body: {
    device_code: string;
    user_code: string;
    verification_url: string;
    direct_verification_url?: string;
    interval: number;
    expires_in: number;
  } = await res.json();
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUrl: body.verification_url,
    directVerificationUrl: body.direct_verification_url ?? null,
    interval: body.interval,
    expiresIn: body.expires_in,
  };
}

/** Resolves to null while the user hasn't approved yet (RD answers 403 until then). */
export async function pollDeviceCredentials(
  deviceCode: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const res = await fetch(
    `${OAUTH_URL}/device/credentials?client_id=${OPEN_SOURCE_CLIENT_ID}&code=${encodeURIComponent(deviceCode)}`,
  );
  if (res.status === 403) return null;
  if (!res.ok) throw await toRdError(res);
  const body: { client_id: string; client_secret: string } = await res.json();
  return { clientId: body.client_id, clientSecret: body.client_secret };
}

export async function completeDeviceLogin(clientId: string, clientSecret: string, deviceCode: string): Promise<void> {
  const token = await requestToken(clientId, clientSecret, deviceCode);
  await authItem.setValue({ kind: "oauth", clientId, clientSecret, ...token });
}

export async function signInWithToken(accessToken: string): Promise<void> {
  const res = await fetch("https://api.real-debrid.com/rest/1.0/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await toRdError(res);
  await authItem.setValue({ kind: "token", accessToken });
}

export async function signOut(): Promise<void> {
  const auth = await authItem.getValue();
  await authItem.setValue(null);
  // A private API token is the user's permanent key; only revoke tokens we minted.
  if (auth?.kind !== "oauth") return;
  try {
    await fetch("https://api.real-debrid.com/rest/1.0/disable_access_token", {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
  } catch (error) {
    console.warn("Token revoke failed", error);
  }
}

export async function getAccessToken(): Promise<string | null> {
  const auth = await authItem.getValue();
  if (!auth) return null;
  if (auth.kind === "token" || auth.expiresAt - REFRESH_MARGIN_MS > Date.now()) return auth.accessToken;
  return refreshAccessToken(auth.accessToken);
}

/**
 * Serialized across popup, manager and worker with a Web Lock so concurrent
 * callers never spend the same refresh token twice.
 */
export async function refreshAccessToken(staleToken: string): Promise<string | null> {
  return navigator.locks.request("rd-token-refresh", async () => {
    const auth = await authItem.getValue();
    if (!auth) return null;
    if (auth.accessToken !== staleToken) return auth.accessToken;
    if (auth.kind === "token") {
      await authItem.setValue(null);
      return null;
    }
    try {
      const token = await requestToken(auth.clientId, auth.clientSecret, auth.refreshToken);
      await authItem.setValue({ ...auth, ...token });
      return token.accessToken;
    } catch (error) {
      // Only a rejected refresh token means the session is gone; 429 and 5xx are retryable.
      if (error instanceof RdError && [400, 401, 403].includes(error.status)) {
        await authItem.setValue(null);
        return null;
      }
      throw error;
    }
  });
}

async function requestToken(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const res = await fetch(`${OAUTH_URL}/token`, {
    method: "POST",
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: DEVICE_GRANT }),
  });
  if (!res.ok) throw await toRdError(res);
  const body: { access_token: string; refresh_token: string; expires_in: number } = await res.json();
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}
