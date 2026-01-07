/**
 * Real-Debrid OAuth Device Code Flow
 *
 * Flow:
 * 1. Request device code from /oauth/v2/device/code
 * 2. User visits verification_url and enters user_code
 * 3. Poll /oauth/v2/device/credentials until client_id and client_secret are returned
 * 4. Exchange for access token via /oauth/v2/token
 * 5. Store tokens and handle refresh when needed
 */

const OAUTH_BASE_URL = "https://api.real-debrid.com/oauth/v2";
const CLIENT_ID = "X245A4XAIBGVM";

/**
 * Build the direct authorization URL that users visit to authorize the app
 */
export function buildAuthorizationUrl(deviceCode: string): string {
  return `https://real-debrid.com/authorize?client_id=${CLIENT_ID}&device_id=${deviceCode}`;
}

/**
 * Response from device code request
 */
export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  interval: number;
  expires_in: number;
  verification_url: string;
  direct_verification_url?: string;
}

/**
 * Response from device credentials polling
 */
export interface DeviceCredentialsResponse {
  client_id: string;
  client_secret: string;
}

/**
 * Response from token exchange
 */
export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
}

/**
 * Stored authentication data
 */
export interface AuthData {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  expiresAt: number;
}

export class OAuthError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "OAuthError";
    this.code = code;
  }
}

/**
 * Step 1: Request a device code for OAuth flow
 */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const url = `${OAUTH_BASE_URL}/device/code?client_id=${CLIENT_ID}&new_credentials=yes`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new OAuthError(
      error.error || `Failed to request device code: ${response.status}`,
      error.error
    );
  }

  return response.json();
}

/**
 * Step 2: Poll for device credentials
 * Returns null if still waiting for user authorization
 * Throws on error or expiration
 */
export async function pollDeviceCredentials(
  deviceCode: string
): Promise<DeviceCredentialsResponse | null> {
  const url = `${OAUTH_BASE_URL}/device/credentials?client_id=${CLIENT_ID}&code=${deviceCode}`;

  const response = await fetch(url);

  if (response.status === 403) {
    // Not authorized yet, keep polling
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new OAuthError(
      error.error || `Failed to get credentials: ${response.status}`,
      error.error
    );
  }

  return response.json();
}

/**
 * Step 3: Exchange device code for access token
 */
export async function exchangeToken(
  clientId: string,
  clientSecret: string,
  deviceCode: string
): Promise<TokenResponse> {
  const url = `${OAUTH_BASE_URL}/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: deviceCode,
    grant_type: "http://oauth.net/grant_type/device/1.0",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new OAuthError(
      error.error || `Failed to exchange token: ${response.status}`,
      error.error
    );
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenResponse> {
  const url = `${OAUTH_BASE_URL}/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: refreshToken,
    grant_type: "http://oauth.net/grant_type/device/1.0",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new OAuthError(
      error.error || `Failed to refresh token: ${response.status}`,
      error.error
    );
  }

  return response.json();
}

/**
 * OAuth flow controller for managing the device code flow
 */
export interface OAuthFlowCallbacks {
  onDeviceCode: (response: DeviceCodeResponse) => void;
  onSuccess: (authData: AuthData) => void;
  onError: (error: Error) => void;
}

export class OAuthFlow {
  private deviceCode: string | null = null;
  private pollingInterval: number | null = null;
  private expiresAt: number | null = null;
  private cancelled = false;
  private clientCredentials: DeviceCredentialsResponse | null = null;

  /**
   * Start the OAuth device code flow
   */
  async start(callbacks: OAuthFlowCallbacks): Promise<void> {
    this.cancelled = false;

    try {
      // Step 1: Get device code
      const deviceCodeResponse = await requestDeviceCode();
      this.deviceCode = deviceCodeResponse.device_code;
      this.pollingInterval = deviceCodeResponse.interval * 1000;
      this.expiresAt = Date.now() + deviceCodeResponse.expires_in * 1000;

      callbacks.onDeviceCode(deviceCodeResponse);

      // Step 2: Poll for credentials
      await this.pollForCredentials(callbacks);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Poll for device credentials until authorized or expired
   */
  private async pollForCredentials(callbacks: OAuthFlowCallbacks): Promise<void> {
    while (!this.cancelled && this.deviceCode && this.expiresAt) {
      // Check expiration
      if (Date.now() >= this.expiresAt) {
        callbacks.onError(new OAuthError("Device code expired", "expired_token"));
        return;
      }

      try {
        const credentials = await pollDeviceCredentials(this.deviceCode);

        if (credentials) {
          this.clientCredentials = credentials;

          // Step 3: Exchange for token
          const tokenResponse = await exchangeToken(
            credentials.client_id,
            credentials.client_secret,
            this.deviceCode
          );

          const authData: AuthData = {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            clientId: credentials.client_id,
            clientSecret: credentials.client_secret,
            expiresAt: Date.now() + tokenResponse.expires_in * 1000,
          };

          callbacks.onSuccess(authData);
          return;
        }
      } catch (error) {
        // Only report non-authorization errors
        if (error instanceof OAuthError && error.code !== "authorization_pending") {
          callbacks.onError(error);
          return;
        }
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, this.pollingInterval || 5000)
      );
    }
  }

  /**
   * Cancel the OAuth flow
   */
  cancel(): void {
    this.cancelled = true;
    this.deviceCode = null;
    this.clientCredentials = null;
  }
}

/**
 * Check if auth data is expired
 * Note: Real-Debrid tokens typically don't expire, so this returns false
 * unless explicitly set with a valid expiry time that has passed
 */
export function isTokenExpired(authData: AuthData): boolean {
  // If no expiry set or set to 0, token is considered valid (doesn't expire)
  if (!authData.expiresAt || authData.expiresAt === 0) {
    return false;
  }
  // Only return true if actually expired (no buffer needed since tokens rarely expire)
  return Date.now() >= authData.expiresAt;
}

/**
 * Create a new OAuthFlow instance
 */
export function createOAuthFlow(): OAuthFlow {
  return new OAuthFlow();
}

export default {
  requestDeviceCode,
  pollDeviceCredentials,
  exchangeToken,
  refreshAccessToken,
  isTokenExpired,
  createOAuthFlow,
  OAuthFlow,
};
