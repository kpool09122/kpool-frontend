import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const identifier = "019a1234-5678-7000-8000-111111111111";
const context = { params: Promise.resolve({ contactIdentifier: identifier }) };
const request = (body = JSON.stringify({ content: "Follow-up" })) => new NextRequest(`http://localhost/api/site-management/contact/me/${identifier}/replies`, {
  method: "POST",
  headers: { Cookie: "session=member", "X-XSRF-TOKEN": "csrf", "Accept-Language": "ja" },
  body,
});

beforeEach(() => { vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("submitter contact reply BFF", () => {
  it("forwards only content to the own-contact API and preserves CSRF, locale and renewed cookies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "Set-Cookie": "session=renewed; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(), context);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBe("session=renewed; HttpOnly");
    expect(fetchMock).toHaveBeenCalledWith(`http://backend.test/api/v1/site-management/my/contact/${identifier}/replies`, expect.objectContaining({
      method: "POST", cache: "no-store", body: JSON.stringify({ content: "Follow-up" }),
      headers: expect.objectContaining({ Cookie: "session=member", "X-XSRF-TOKEN": "csrf", "Accept-Language": "ja" }),
    }));
  });

  it.each([401, 403, 404, 422, 429, 500])("preserves backend rejection %s and its ProblemDetails", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Unable to reply", code: "rejected" }, { status, headers: { "Set-Cookie": "session=updated" } })));
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ message: "Unable to reply", code: "rejected" });
    expect(response.headers.get("Set-Cookie")).toBe("session=updated");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([{ content: "   " }, { content: "Reply", principalIdentifier: identifier }, { content: "Reply", name: "Forged author" }])("rejects invalid or forged input without calling the API: %j", async (body) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request(JSON.stringify(body)), context)).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and identifiers without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request("{"), context)).status).toBe(400);
    expect((await POST(request(), { params: Promise.resolve({ contactIdentifier: "../other" }) })).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a generic error when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Private upstream details")));
    const response = await POST(request(), context);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: "Contact API is temporarily unavailable." });
  });
});
