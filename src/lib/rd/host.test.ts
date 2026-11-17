import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const APP = "https://app.real-debrid.com";
const API = "https://api.real-debrid.com";

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let rdFetch: (path: string, init?: RequestInit) => Promise<Response>;

function blockHost(blocked: string | null): void {
  fetchMock.mockImplementation(async (input) =>
    blocked && String(input).startsWith(blocked)
      ? Promise.reject(new TypeError("Failed to fetch"))
      : new Response("ok"),
  );
}

const hostsCalled = (): string[] => fetchMock.mock.calls.map(([input]) => new URL(String(input)).origin);

beforeEach(async () => {
  vi.resetModules();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  ({ rdFetch } = await import("./host"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rdFetch", () => {
  it("calls app.real-debrid.com when it answers", async () => {
    blockHost(null);

    await rdFetch("/rest/1.0/time");

    expect(fetchMock).toHaveBeenCalledWith(`${APP}/rest/1.0/time`, undefined);
  });

  it("retries the same request on api.real-debrid.com after a network error", async () => {
    blockHost(APP);
    const init = { method: "POST", body: new URLSearchParams({ code: "x" }) };

    await rdFetch("/oauth/v2/token", init);

    expect(fetchMock).toHaveBeenLastCalledWith(`${API}/oauth/v2/token`, init);
  });

  it("keeps using the host that answered for later requests", async () => {
    blockHost(APP);

    await rdFetch("/rest/1.0/user");
    await rdFetch("/rest/1.0/torrents");

    expect(hostsCalled()).toEqual([APP, API, API]);
  });

  it("switches back to app.real-debrid.com when api.real-debrid.com stops answering", async () => {
    blockHost(APP);
    await rdFetch("/rest/1.0/user");
    blockHost(API);

    await rdFetch("/rest/1.0/user");

    expect(hostsCalled()).toEqual([APP, API, API, APP]);
  });

  it("returns HTTP errors without trying the other host", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));

    const res = await rdFetch("/rest/1.0/user");

    expect({ status: res.status, hosts: hostsCalled() }).toEqual({ status: 503, hosts: [APP] });
  });

  it("rethrows the network error when every host fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = rdFetch("/rest/1.0/user");

    await expect(result).rejects.toThrow("Failed to fetch");
  });
});
