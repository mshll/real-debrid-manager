/**
 * Real-Debrid API Client
 * Base URL: https://api.real-debrid.com/rest/1.0
 * Rate limit: 250 requests/minute
 */

const BASE_URL = "https://api.real-debrid.com/rest/1.0";

// Rate limit tracking
const RATE_LIMIT = 250;
const RATE_WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

export interface ApiError {
  error: string;
  error_code?: number;
}

export class RealDebridApiError extends Error {
  public readonly code?: number;
  public readonly status: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "RealDebridApiError";
    this.status = status;
    this.code = code;
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions<T = unknown> {
  method: HttpMethod;
  path: string;
  body?: T;
  token?: string;
  skipAuth?: boolean;
}

/**
 * Check if we're approaching the rate limit
 */
export function getRateLimitStatus(): {
  remaining: number;
  resetInMs: number;
} {
  const now = Date.now();
  // Clean up old timestamps
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_WINDOW_MS
  );

  const oldestTimestamp = requestTimestamps[0];
  const resetInMs = oldestTimestamp
    ? RATE_WINDOW_MS - (now - oldestTimestamp)
    : 0;

  return {
    remaining: RATE_LIMIT - requestTimestamps.length,
    resetInMs: Math.max(0, resetInMs),
  };
}

/**
 * Track a request for rate limiting
 */
function trackRequest(): void {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_WINDOW_MS
  );
  requestTimestamps.push(now);
}

/**
 * Wait if we're at the rate limit
 */
async function waitForRateLimit(): Promise<void> {
  const { remaining, resetInMs } = getRateLimitStatus();
  if (remaining <= 0) {
    await new Promise((resolve) => setTimeout(resolve, resetInMs + 100));
  }
}

/**
 * Generic API request function
 */
export async function request<TResponse, TBody = unknown>(
  options: RequestOptions<TBody>
): Promise<TResponse> {
  const { method, path, body, token, skipAuth = false } = options;

  // Rate limit check
  await waitForRateLimit();

  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};

  if (!skipAuth) {
    if (!token) {
      throw new RealDebridApiError("Authorization token is required", 401);
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Handle body based on method and content type
  if (body !== undefined) {
    if (body instanceof FormData) {
      // FormData for file uploads - don't set Content-Type, let browser set it
      fetchOptions.body = body;
    } else if (typeof body === "object") {
      // URL-encoded form data for POST requests
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      fetchOptions.body = params.toString();
    }
  }

  // Track request for rate limiting
  trackRequest();

  const response = await fetch(url, fetchOptions);

  // Handle empty responses (204 No Content, etc.)
  const contentType = response.headers.get("content-type");
  const hasJson = contentType?.includes("application/json");

  if (!response.ok) {
    if (hasJson) {
      const errorData: ApiError = await response.json();
      throw new RealDebridApiError(
        errorData.error || "Unknown API error",
        response.status,
        errorData.error_code
      );
    }
    throw new RealDebridApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status
    );
  }

  // Return empty object for 204 or empty responses
  if (response.status === 204 || !hasJson) {
    return {} as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

/**
 * Convenience methods for different HTTP verbs
 */
export function get<TResponse>(
  path: string,
  token?: string,
  skipAuth?: boolean
): Promise<TResponse> {
  return request<TResponse>({ method: "GET", path, token, skipAuth });
}

export function post<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  token?: string
): Promise<TResponse> {
  return request<TResponse, TBody>({ method: "POST", path, body, token });
}

export function put<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  token?: string
): Promise<TResponse> {
  return request<TResponse, TBody>({ method: "PUT", path, body, token });
}

export function del<TResponse>(
  path: string,
  token?: string
): Promise<TResponse> {
  return request<TResponse>({ method: "DELETE", path, token });
}
