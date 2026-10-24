import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as list } from "./route";
import { GET as detail } from "./[contactIdentifier]/route";

const id = "11111111-1111-4111-8111-111111111111";
const contact = { contactIdentifier: id, identityIdentifier: null, category: 1, name: "山田花子", content: "お問い合わせ", createdAt: "2026-10-01T10:00:00+09:00", replyIdentifiers: [] };
const request = () => new NextRequest("http://localhost/api/site-management/contact/me?principalIdentifier=untrusted", { headers: { Cookie: "session=own-session", "Accept-Language": "ko", "X-XSRF-TOKEN": "csrf" } });
const context = (contactIdentifier = id) => ({ params: Promise.resolve({ contactIdentifier }) });
beforeEach(() => vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("own contact BFF", () => {
  it("preserves main Problem Details fields together with refresh cookies", async () => {
    const problem = { type: "https://example.test/problems/principal-stopped", title: "Forbidden", status: 403, detail: "利用権限が停止されています。", code: "principal_stopped" };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Response.json(problem, { status: 403, headers: { "Set-Cookie": "session=refreshed; HttpOnly" } })));
    for (const response of [await list(request()), await detail(request(), context())]) {
      expect(await response.json()).toEqual({ ...problem, message: problem.detail });
      expect(response.status).toBe(403);
      expect(response.headers.getSetCookie()).toEqual(["session=refreshed; HttpOnly"]);
    }
  });
  it("forwards authentication and locale, ignores owner query, never caches, and returns session refresh cookies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([contact], { headers: { "Set-Cookie": "session=refreshed; HttpOnly; Path=/" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await list(request());
    expect(await response.json()).toEqual([contact]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.getSetCookie()).toEqual(["session=refreshed; HttpOnly; Path=/"]);
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/v1/site-management/my/contact", expect.objectContaining({ method: "GET", cache: "no-store", headers: expect.objectContaining({ Cookie: "session=own-session", "Accept-Language": "ko" }) }));
  });
  it.each([
    { replyIdentifier: id, content: "返信", sentAt: contact.createdAt },
    { replyIdentifier: id, content: "返信", sentAt: null, replyType: "submitter", createdAt: contact.createdAt },
  ])("uses only the own detail endpoint and strips author data without changing reply fields: %j", async (reply) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...contact, principalIdentifier: id, replies: [{ ...reply, name: "private", principalIdentifier: id }] }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await detail(request(), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ contactIdentifier: id, identityIdentifier: null, category: contact.category, name: contact.name, content: contact.content, createdAt: contact.createdAt, replies: [reply] });
    expect(fetchMock.mock.calls[0][0]).toBe(`http://backend.test/api/v1/site-management/my/contact/${id}`);
  });
  it.each([401, 403, 404, 422, 429, 500])("preserves upstream status %s and cookies for both routes", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Response.json({ detail: "rejected" }, { status, headers: { "Set-Cookie": "session=; Max-Age=0" } })));
    for (const response of [await list(request()), await detail(request(), context())]) {
      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.getSetCookie()).toEqual(["session=; Max-Age=0"]);
      expect(await response.json()).toEqual({ detail: "rejected", message: "rejected" });
    }
  });
  it.each(["../other", "not-uuid", "", `${id}?other=1`])("rejects an invalid detail ID without upstream access: %s", async (invalid) => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await detail(request(), context(invalid))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not invent or inject an authenticated principal when cookies are absent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}, { status: 401 })); vi.stubGlobal("fetch", fetchMock);
    expect((await list(new NextRequest("http://localhost/api/site-management/contact/me"))).status).toBe(401);
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Cookie");
  });
  it("returns a safe no-store 502 for network, JSON and schema failures", async () => {
    for (const createResponse of [() => { throw new Error("network"); }, () => new Response("bad JSON"), () => Response.json({ unexpected: true })]) {
      vi.stubGlobal("fetch", vi.fn().mockImplementation(createResponse));
      for (const response of [await list(request()), await detail(request(), context())]) {
        expect(response.status).toBe(502);
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
    }
  });
  it.each(["list", "detail"] as const)("preserves separate refresh cookies and a safe schema error on the %s route", async (route) => {
    const cookies = ["session=refreshed; HttpOnly; Path=/", "XSRF-TOKEN=refreshed; Path=/; SameSite=Lax"];
    const upstream = Response.json({ unexpected: "private upstream payload" });
    cookies.forEach((cookie) => upstream.headers.append("Set-Cookie", cookie));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
    const response = route === "list" ? await list(request()) : await detail(request(), context());
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.getSetCookie()).toEqual(cookies);
    expect(await response.json()).toEqual({ message: "Contact API response did not match the expected schema." });
  });
  it("fails closed without configured API and never requests another service", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await list(request())).status).toBe(500);
    expect((await detail(request(), context())).status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
