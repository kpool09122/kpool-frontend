import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";
import { POST as sendEmail } from "./email/route";
import { POST as verifyEmail } from "./email/verification/route";

const request = (method: string, body?: unknown) => new Request("https://app.example.test/api/identity/auth/social/link?email=attacker@example.com&returnTo=//evil.example", {
  method,
  headers: { Cookie: "laravel_session=original", "Accept-Language": "ko", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}) as NextRequest;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Set-Cookie": "laravel_session=renewed; Path=/; HttpOnly" },
});
const session = { provider: "google", email: "member@example.com", expiresAt: "2026-09-27T12:00:00+00:00" };

describe("social linking routes", () => {
  beforeEach(() => vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test"));
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each([
    [GET, "GET", "/auth/social/link", undefined, session],
    [sendEmail, "POST", "/auth/social/link/email", undefined, { accepted: true }],
    [verifyEmail, "POST", "/auth/social/link/email/verification", { authCode: "012345" }, { redirectUrl: "/admin" }],
  ] as const)("forwards session cookies, rotated cookies and language for %s", async (handler, method, path, body, responseBody) => {
    const fetchMock = vi.fn().mockResolvedValue(json(responseBody));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handler(request(method, body));
    expect(fetchMock).toHaveBeenCalledWith(`https://identity.example.test/api/identity${path}`, expect.objectContaining({
      method, cache: "no-store", headers: expect.objectContaining({ Cookie: "laravel_session=original", "Accept-Language": "ko" }),
    }));
    expect(fetchMock.mock.calls[0][1].body).toBe(body === undefined ? undefined : JSON.stringify(body));
    expect(await response.json()).toEqual(responseBody);
    expect(response.headers.get("set-cookie")).toContain("laravel_session=renewed");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("never forwards client-selected linking targets or return paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ redirectUrl: "/admin" }));
    vi.stubGlobal("fetch", fetchMock);
    await verifyEmail(request("POST", { authCode: "123456", email: "attacker@example.com", provider: "line", returnTo: "//evil.example", pendingKey: "evil" }));
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ authCode: "123456" }));
    fetchMock.mockResolvedValue(json({ accepted: true }));
    await sendEmail(request("POST", { email: "attacker@example.com" }));
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
  });

  it("keeps expired-session responses private and preserves their status and cookies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "Linking expired" }, 422)));
    const response = await GET(request("GET"));
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("laravel_session=renewed");
  });

  it("rejects malformed upstream data without exposing or caching it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ provider: "google" })));
    const response = await GET(request("GET"));
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not forward invalid verification codes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await verifyEmail(request("POST", { authCode: "abcdef" }));
    expect(response.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
