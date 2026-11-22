import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./principal/me/route";
import { POST } from "./principals/route";
import { GET as GROUPS } from "./principal-groups/route";
import { PATCH } from "./principal-groups/members/route";
const fetcher = vi.fn();
const id = "11111111-1111-4111-8111-111111111111";
const principal = { principalIdentifier: id, identityIdentifier: id, status: "active", accountPrincipalCount: 1, policies: [] };
const request = (path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) => new NextRequest(`http://127.0.0.1:3675/api/monetization/${path}`, { method, headers: { host: "127.0.0.1:3675", cookie: "session=test", "accept-language": "ko", ...(method === "GET" ? {} : { origin: "http://127.0.0.1:3675", "x-xsrf-token": "csrf", "content-type": "application/json" }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => { vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", "http://backend.test"); vi.stubGlobal("fetch", fetcher); fetcher.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Monetization BFF", () => {
 it("forwards current-session headers, no-store and cookies even on invalid schemas", async () => {
  fetcher.mockResolvedValue(Response.json({}, { headers: { "set-cookie": "session=rotated; HttpOnly" } }));
  const result = await GET(request("principal/me"));
  expect(result.status).toBe(502); expect(result.headers.get("set-cookie")).toContain("rotated");
  expect(fetcher).toHaveBeenCalledWith("http://backend.test/api/v1/monetization/principal/me", expect.objectContaining({ cache: "no-store", headers: expect.objectContaining({ Cookie: "session=test", "Accept-Language": "ko" }) }));
 });
 it("returns a validated current snapshot", async () => { fetcher.mockResolvedValue(Response.json(principal)); expect(await (await GET(request("principal/me"))).json()).toEqual(principal); });
 it.each([404, 409, 422, 500])("masks internals while preserving status and public conflict code %s", async status => {
  fetcher.mockResolvedValue(Response.json({ message: "internal SQL", trace: ["secret"], exception: "secret", code: "last_active_manager" }, { status }));
  const result = await GET(request("principal/me")); const body = await result.json();
  expect(result.status).toBe(status); expect(body).not.toHaveProperty("trace"); expect(body).not.toHaveProperty("exception");
  if (status === 500) expect(body.message).not.toContain("SQL");
 });
 it("requires authentication and rejects cross-site and missing-CSRF activation before fetch", async () => {
  expect((await POST(request("principals", "POST", undefined, { cookie: "" }))).status).toBe(401);
  expect((await POST(request("principals", "POST", undefined, { origin: "https://evil.test" }))).status).toBe(403);
  expect((await POST(request("principals", "POST", undefined, { "x-xsrf-token": "" }))).status).toBe(419);
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("accepts actual loopback origin and never forwards caller-selected identity/account", async () => {
  fetcher.mockResolvedValue(Response.json({ principalIdentifier: id, identityIdentifier: id }, { status: 201 }));
  expect((await POST(request("principals", "POST", { accountIdentifier: "foreign" }))).status).toBe(201);
  expect(fetcher.mock.calls[0][1]).not.toHaveProperty("body");
 });
 it("joins groups and all members (including members in no group)", async () => {
  const member = { principalIdentifier: id, identityIdentifier: id, identityName: "User", email: "u@example.test", status: "suspended" };
  fetcher.mockResolvedValueOnce(Response.json({ principalGroups: [] })).mockResolvedValueOnce(Response.json({ members: [member] }));
  expect(await (await GROUPS(request("principal-groups"))).json()).toEqual({ groups: [], users: [member] });
 });
 it("rejects invalid bulk payloads without backend writes", async () => {
  expect((await PATCH(request("principal-groups/members", "PATCH", { principalGroups: [{ principalGroupIdentifier: "invalid" }] }))).status).toBe(422); expect(fetcher).not.toHaveBeenCalled();
 });
 it("uses save-then-refetch, including status-only summaries with no group scope", async () => {
  fetcher.mockResolvedValueOnce(Response.json({ principalGroups: [], principalStatuses: [{ principalIdentifier: id, status: "suspended" }] }, { headers: { "set-cookie": "session=rotated" } })).mockResolvedValueOnce(Response.json({ principalGroups: [] })).mockResolvedValueOnce(Response.json({ members: [] }));
  const result = await PATCH(request("principal-groups/members", "PATCH", { principalStatuses: [{ principalIdentifier: id, status: "suspended" }] }));
  expect(await result.json()).toEqual({ committed: true, refresh: { ok: true, data: { groups: [], users: [] } } });
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(["http://backend.test/api/v1/monetization/principal-groups/members", "http://backend.test/api/v1/monetization/principal-groups", "http://backend.test/api/v1/monetization/members"]);
  expect(fetcher.mock.calls[1][1].headers.Cookie).toBe("session=rotated");
 });
 it.each([401, 403, 500])("keeps committed writes distinct from refresh failure %s", async status => {
  fetcher.mockResolvedValueOnce(Response.json({ principalGroups: [], principalStatuses: [] })).mockResolvedValueOnce(Response.json({ message: "secret SQL", trace: ["secret"] }, { status, headers: { "set-cookie": "session=refresh" } }));
  const result = await PATCH(request("principal-groups/members", "PATCH", {})); const body = await result.json();
  expect(result.status).toBe(200); expect(body.committed).toBe(true); expect(body.refresh).toMatchObject({ ok: false, status }); expect(body.refresh).not.toHaveProperty("trace"); expect(result.headers.get("set-cookie")).toContain("refresh");
 });
});
