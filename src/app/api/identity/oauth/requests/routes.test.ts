import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as create } from "./route";
import { GET as get } from "./[requestIdentifier]/route";
import { POST as approve } from "./[requestIdentifier]/approve/route";
import { POST as deny } from "./[requestIdentifier]/deny/route";

const body = { clientIdentifier: "00000000-0000-4000-8000-000000000001", redirectUri: "https://client.example/callback", scopes: ["wiki:read"], resource: "https://api.example/mcp", codeChallenge: "challenge", codeChallengeMethod: "S256", responseType: "code", state: "opaque state" };
const detail = { requestIdentifier: "req", expiresAt: "2026-12-01T00:00:00Z", clientName: "ChatGPT", scopes: [{ scope: "wiki:read", description: "Read Wiki" }] };
const context = () => ({ params: Promise.resolve({ requestIdentifier: "req" }) });
const req = (method = "POST", value: unknown = body, headers: Record<string, string> = { cookie: "session=secret", "X-XSRF-TOKEN": "csrf", "Accept-Language": "ko" }) => new NextRequest("https://frontend.example/api/identity/oauth/requests", { method, headers, ...(method === "POST" ? { body: JSON.stringify(value) } : {}) });
beforeEach(() => vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example/api/v1/identity"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("OAuth consent BFF", () => {
  it.each([
    ["create", 201, { requestIdentifier: "req", expiresAt: detail.expiresAt }],
    ["get", 200, detail],
    ["approve", 200, { redirectUri: "https://client.example/callback?code=secret&state=state" }],
    ["deny", 200, { redirectUri: "https://client.example/callback?error=access_denied&state=state" }],
  ] as const)("forwards %s cookies, language and CSRF with no-store", async (action, status, result) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...result, accessToken: "must-not-leak" }), { status, headers: { "set-cookie": "session=rotated" } })); vi.stubGlobal("fetch", fetchMock);
    const response = action === "create" ? await create(req()) : action === "get" ? await get(req("GET"), context()) : action === "approve" ? await approve(req("POST", { scopes: ["wiki:read"], extra: "strip" }), context()) : await deny(req(), context());
    expect(response.status).toBe(status); expect(await response.json()).toEqual(result);
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("set-cookie")).toContain("session=rotated");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://backend.example/api/v1/identity/oauth/requests${action === "create" ? "" : `/req${action === "get" ? "" : `/${action}`}`}`);
    expect(options).toMatchObject({ cache: "no-store", redirect: "manual", headers: { Cookie: "session=secret", "Accept-Language": "ko", "X-XSRF-TOKEN": "csrf" } });
    if (action === "approve") expect(JSON.parse(options.body)).toEqual({ scopes: ["wiki:read"] });
    if (action === "deny") expect(options.body).toBeUndefined();
  });
  it.each([400, 401, 403, 404, 409, 419, 422, 429, 500, 503])("masks upstream errors at %i without dropping cookies", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "secret SQL", code: "oauth_request_expired", exception: "trace" }), { status, headers: { "set-cookie": "session=rotated" } })));
    const response = await approve(req("POST", { scopes: ["wiki:read"] }), context());
    expect(response.status).toBe(status); expect(await response.text()).not.toMatch(/secret SQL|exception|trace/); expect(response.headers.get("set-cookie")).toContain("rotated");
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "//evil.example", "file:///etc/passwd"])("rejects unsafe continuation %s", async (redirectUri) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirectUri }), { headers: { "set-cookie": "session=rotated" } })));
    const response = await deny(req(), context()); expect(response.status).toBe(502); expect(response.headers.get("set-cookie")).toContain("rotated");
  });
  it("rejects empty and duplicate approval scopes before forwarding", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    for (const scopes of [[], ["wiki:read", "wiki:read"], ["unknown"]]) expect((await approve(req("POST", { scopes }), context())).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires cookie and CSRF, and refuses cross-origin submissions", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await create(req("POST", body, {}))).status).toBe(401);
    expect((await create(req("POST", body, { cookie: "session=secret" }))).status).toBe(419);
    const request = req(); request.headers.set("origin", "https://evil.example"); expect((await create(request)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["not json", JSON.stringify({ requestIdentifier: "req" })])("retains rotated cookies on invalid detail response", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(payload, { headers: { "set-cookie": "session=rotated" } })));
    const response = await get(req("GET"), context()); expect(response.status).toBe(502); expect(response.headers.get("set-cookie")).toContain("rotated");
  });
  it("preserves rotated cookies even when reading the upstream body fails", async () => {
    const upstream = new Response("incomplete", { headers: { "set-cookie": "session=rotated" } });
    vi.spyOn(upstream, "text").mockRejectedValue(new Error("stream interrupted"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
    const response = await get(req("GET"), context());
    expect(response.status).toBe(502); expect(response.headers.get("set-cookie")).toContain("rotated");
  });
  it("handles network failure and missing API configuration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private host")));
    expect((await create(req())).status).toBe(502);
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", ""); expect((await create(req())).status).toBe(500);
  });
});
