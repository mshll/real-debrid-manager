import { getAccessToken, refreshAccessToken } from "./auth";
import { RdError, toRdError } from "./errors";

export const API_URL = "https://api.real-debrid.com/rest/1.0";
const MAX_RATE_LIMIT_RETRIES = 3;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | undefined>;
  form?: Record<string, string>;
  body?: Blob;
  auth?: boolean;
}

export async function rdRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = "GET", query, form, body, auth = true } = options;
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    const headers: Record<string, string> = {};
    let token: string | null = null;
    if (auth) {
      token = await getAccessToken();
      if (!token) throw new RdError("Not signed in", 401, 8);
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(url, { method, headers, body: form ? new URLSearchParams(form) : body });

    if (res.status === 401 && token && !refreshed) {
      refreshed = true;
      if (await refreshAccessToken(token)) continue;
    }
    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw await toRdError(res);
    return res;
  }
}

export async function rdJson<T>(path: string, options?: RequestOptions): Promise<T> {
  const res = await rdRequest(path, options);
  return res.json();
}

export interface Page<T> {
  items: T[];
  total: number;
}

const PAGE_LIMIT = 2500;

/** Walks every page; RD answers 204 instead of [] past the last page. */
export async function rdAll<T>(path: string, query: RequestOptions["query"] = {}): Promise<Page<T>> {
  const items: T[] = [];
  let total = 0;
  for (let page = 1; ; page++) {
    const res = await rdRequest(path, { query: { ...query, page, limit: PAGE_LIMIT } });
    if (res.status === 204) break;
    total = Number(res.headers.get("X-Total-Count") ?? 0);
    const batch: T[] = await res.json();
    items.push(...batch);
    if (batch.length < PAGE_LIMIT || items.length >= total) break;
  }
  return { items, total: Math.max(total, items.length) };
}
