import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { PATCH } from "./members/route";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const request = () => new NextRequest("http://localhost/api/site-management/principal-groups?accountIdentifier=untrusted", { headers: { Cookie: "session=test", "Accept-Language": "ko", "X-XSRF-TOKEN": "csrf" } });
describe("SiteManagement BFF", () => {
  it("forwards cookies/language without caller account query and preserves set-cookie", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ principalGroups: [], principals: [] }, { headers: { "Set-Cookie": "session=new; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/v1/site-management/principal-groups", expect.objectContaining({ cache: "no-store", headers: expect.objectContaining({ Cookie: "session=test", "Accept-Language": "ko", "X-XSRF-TOKEN": "csrf" }) }));
  });
  it.each([401,403,404,422,503])("preserves %s without leaking details", async (status) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "secret database" }, { status })));
    const response = await GET(request()); expect(response.status).toBe(status); expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
  it.each([{}, { principalGroups: [] }, null])("rejects invalid schema %j", async (body) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    expect((await GET(request())).status).toBe(502);
  });
  it.each(["json", "schema"])("preserves rotated cookies on invalid GET %s", async (kind) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const headers = new Headers(); headers.append("Set-Cookie", "session=new; HttpOnly"); headers.append("Set-Cookie", "XSRF-TOKEN=new; Path=/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(kind === "json" ? "not json" : "{}", { headers })));
    const response = await GET(request()); expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(await response.json()).toEqual({ message: "SiteManagement principal groups are unavailable." });
  });
  const id = "11111111-1111-4111-8111-111111111111";
  const patchRequest = () => new NextRequest("http://localhost/api/site-management/principal-groups/members", { method: "PATCH", headers: request().headers, body: JSON.stringify({ principalGroups: [{ principalGroupIdentifier: id, principalIdentifiers: [] }] }) });
  const summary = { principalGroups: [{ principalGroupIdentifier: id, accountIdentifier: id, name: "Admin", description: null, isDefault: false, memberCount: 0 }] };
  it("accepts backend summaries then returns authoritative GET without account query", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(summary, { headers: { "Set-Cookie": "session=rotated; HttpOnly" } })).mockResolvedValueOnce(Response.json({ principalGroups: [], principals: [] }, { headers: { "Set-Cookie": "session=latest; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ committed: true, refresh: { ok: true, data: { principalGroups: [], principals: [] } } });
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([["http://backend.test/api/v1/site-management/principal-groups/members", "PATCH"], ["http://backend.test/api/v1/site-management/principal-groups", "GET"]]);
    expect(fetchMock.mock.calls[1][1].headers.Cookie).toBe("session=rotated");
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });
  it.each([401,403,503])("reports committed save separately from GET %s", async (status) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(summary)).mockResolvedValueOnce(Response.json({ detail: "secret" }, { status })));
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ committed: true, refresh: { ok: false, status } });
  });
  it.each(["network", "schema"])("retains commitment after GET %s failure", async (kind) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const mock = vi.fn().mockResolvedValueOnce(Response.json(summary));
    if (kind === "network") mock.mockRejectedValueOnce(new Error("secret"));
    else mock.mockResolvedValueOnce(Response.json({}));
    vi.stubGlobal("fetch", mock);
    expect(await (await PATCH(patchRequest())).json()).toMatchObject({ committed: true, refresh: { ok: false, kind } });
  });
  it("preserves PATCH422 without attempting GET or leaking details", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const mock = vi.fn().mockResolvedValue(Response.json({ detail: "secret" }, { status: 422 })); vi.stubGlobal("fetch", mock);
    const response = await PATCH(patchRequest()); expect(response.status).toBe(422); expect(mock).toHaveBeenCalledTimes(1); expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
