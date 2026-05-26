import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/identity/auth/social/google/redirect", {
    method: "GET",
    headers,
  }) as NextRequest;

const createContext = (provider: string) => ({
  params: Promise.resolve({ provider }),
});

describe("/api/identity/auth/social/[provider]/redirect route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the encoded provider path and cookies to upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirectUrl: "https://app.example.test/mypage?sso=google" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(createRequest({ cookie: "laravel_session=abc" }), createContext("google oauth"));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/auth/social/google%20oauth/redirect",
      {
        headers: {
          Accept: "application/json",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
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
