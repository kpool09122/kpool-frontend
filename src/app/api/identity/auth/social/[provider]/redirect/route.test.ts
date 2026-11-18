import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (
  headers: Record<string, string> = {},
  search = "",
): NextRequest =>
  new Request(`https://app.example.test/api/identity/auth/social/google/redirect${search}`, {
    method: "GET",
    headers,
  }) as NextRequest;

const createContext = (provider: string) => ({
  params: Promise.resolve({ provider }),
});

describe("/api/identity/auth/social/[provider]/redirect route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards the encoded provider path and cookies to upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirectUrl: "https://app.example.test/admin?sso=google" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      createRequest(
        { cookie: "laravel_session=abc" },
        "?return_to=%2Fwiki%2Fja%2Fgr-aurora-echo%2Fedit&oneTimeToken=invite-token-123",
      ),
      createContext("google oauth"),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/v1/identity/auth/social/google%20oauth/redirect?return_to=%2Fwiki%2Fja%2Fgr-aurora-echo%2Fedit&oneTimeToken=invite-token-123",
      {
        headers: {
          Accept: "application/json",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
  });

  it("preserves nested OAuth callback values, invitation, locale and rotated session cookies", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ redirectUrl: "https://accounts.example.test/oauth" }, { headers: { "Set-Cookie": "session=rotated; HttpOnly; Path=/" } }));
    vi.stubGlobal("fetch", fetchMock);
    const destination = "/auth/oauth/authorize?state=opaque%2B%26%25&resource=https%3A%2F%2Fapi.example%2Fmcp";
    const returnTo = `/admin?authReturnTo=${encodeURIComponent(destination)}`;
    const response = await GET(createRequest({ cookie: "session=old", "accept-language": "ko" }, `?${new URLSearchParams({ return_to: returnTo, oneTimeToken: "invite" })}`), createContext("line"));
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("return_to")).toBe(returnTo);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("oneTimeToken")).toBe("invite");
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Cookie: "session=old", "Accept-Language": "ko" });
    expect(response.headers.get("set-cookie")).toContain("session=rotated");
  });

  it("normalizes an external return_to before forwarding it upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirectUrl: "https://accounts.example.test/oauth" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      createRequest({}, "?return_to=https%3A%2F%2Fevil.example%2Fcallback"),
      createContext("google"),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/v1/identity/auth/social/google/redirect?return_to=%2Fadmin",
      expect.any(Object),
    );
  });

  it.each(["//evil.example/callback", "/\\evil.example/callback", "/wiki\n/ja", "/login?returnTo=/wiki", "/signup"])("rejects unsafe or looping return_to %j at the BFF boundary", async (returnTo) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ redirectUrl: "https://accounts.example.test/oauth" }));
    vi.stubGlobal("fetch", fetchMock);
    await GET(createRequest({}, `?${new URLSearchParams({ return_to: returnTo })}`), createContext("google"));
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("return_to")).toBe("/admin");
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://internal.identity.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("getaddrinfo ENOTFOUND internal.identity.example.test"),
      ),
    );

    const response = await GET(createRequest(), createContext("google"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });
});
