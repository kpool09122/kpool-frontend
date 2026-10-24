import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("site-management contacts list BFF", () => {
  it("forwards isPending=1 instead of confusing pending conversations with reply counts", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ contacts: [], current_page: 1, last_page: 1, total: 0, per_page: 50 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(new NextRequest("http://localhost/api/site-management/contacts?isPending=1&page=1"))).status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe("http://backend.test/api/v1/site-management/contacts?isPending=1&page=1");
  });
  it.each(["", "true", "false", "2", "0&isPending=1", "1&isPending=1"])("rejects malformed pending query %s before upstream", async (value) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await GET(new NextRequest(`http://localhost/api/site-management/contacts?isPending=${value}`))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("forwards only supported list filters to the versioned backend endpoint", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ contacts: [], current_page: 2, last_page: 2, total: 51, per_page: 50 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/site-management/contacts?hasReply=0&page=2&perPage=50&principalIdentifier=019a1234-5678-7000-8000-111111111111&unsupported=ignore", { headers: { Cookie: "session=test", "Accept-Language": "ja" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: 51 });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/v1/site-management/contacts?hasReply=0&page=2&perPage=50&principalIdentifier=019a1234-5678-7000-8000-111111111111", expect.objectContaining({ headers: expect.objectContaining({ Cookie: "session=test", "Accept-Language": "ja" }) }));
  });

  it("keeps hasReply omitted when forwarding the all-inquiries page", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const body = { contacts: [], current_page: 3, last_page: 3, total: 120, per_page: 50 };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/site-management/contacts?page=3&perPage=50"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/v1/site-management/contacts?page=3&perPage=50", expect.objectContaining({ method: "GET", cache: "no-store" }));
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.has("hasReply")).toBe(false);
  });

  it.each(["principalIdentifier=", "principalIdentifier=invalid", "principalIdentifier=019a1234-5678-7000-8000-111111111111&principalIdentifier=019a1234-5678-7000-8000-222222222222"])("rejects an invalid sender query without widening the list: %s", async (query) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest(`http://localhost/api/site-management/contacts?${query}`));
    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403])("does not bypass upstream authorization for a sender-filtered list: %s", async (status) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ detail: "private authorization context" }, { status }));
    vi.stubGlobal("fetch", fetchMock);
    const sender = "019a1234-5678-7000-8000-111111111111";
    const response = await GET(new NextRequest(`http://localhost/api/site-management/contacts?principalIdentifier=${sender}&hasReply=0&page=1&perPage=50`));
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get("principalIdentifier")).toBe(sender);
    expect(new URL(url).searchParams.get("hasReply")).toBe("0");
    expect(init.headers.Cookie).toBeUndefined();
    expect(await response.json()).toEqual({ detail: "private authorization context", message: "private authorization context" });
  });

  it("preserves upstream error details using the existing contact error format", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "private database" }, { status: 403 })));
    const response = await GET(new NextRequest("http://localhost/api/site-management/contacts"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ detail: "private database", message: "private database" });
  });
});
