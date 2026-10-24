import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ contactIdentifier: id }) };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const request = (body: unknown = { content: "追加の状況" }) => new NextRequest(`http://localhost/api/site-management/contact/me/${id}/replies`, { method: "POST", headers: { Cookie: "session=test", "X-XSRF-TOKEN": "csrf", "Accept-Language": "ja" }, body: JSON.stringify(body) });
describe("own contact reply BFF", () => {
  it("posts content only to the own endpoint, forwards CSRF/cookies/locale and preserves 204", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "Set-Cookie": "session=renewed; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(), context);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toContain("session=renewed");
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`http://backend.test/api/v1/site-management/my/contact/${id}/replies`, expect.objectContaining({ method: "POST", cache: "no-store", body: JSON.stringify({ content: "追加の状況" }), headers: expect.objectContaining({ Cookie: "session=test", "X-XSRF-TOKEN": "csrf", "Accept-Language": "ja" }) }));
  });
  it.each([401, 403, 404, 409, 419, 422, 500])("preserves ProblemDetails and cookies without retry for %s", async (status) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ detail: "rejected", code: "principal_inactive" }, { status, headers: { "Set-Cookie": "session=; Max-Age=0" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ message: "rejected", code: "principal_inactive" });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["principalIdentifier", "replyType", "name", "toEmail"])("rejects prohibited field %s", async (field) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request({ content: "reply", [field]: "spoofed" }), context)).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects malformed identifiers and JSON before calling upstream", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request(), { params: Promise.resolve({ contactIdentifier: "bad" }) })).status).toBe(422);
    expect((await POST(new NextRequest("http://localhost", { method: "POST", body: "{" }), context)).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
