import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const identityResponse = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  username: "member",
  email: "member@example.com",
  language: "ja",
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/identity/auth/me", {
    method: "GET",
    headers,
  }) as NextRequest;

const jsonResponse = (
  body: unknown,
  init: ResponseInit = {},
): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

describe("/api/identity/auth/me route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 500 when the Identity API base URL is not configured", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Identity API is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the request cookie to the upstream authenticated identity endpoint", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(identityResponse));
    vi.stubGlobal("fetch", fetchMock);

    await GET(createRequest({ cookie: "laravel_session=abc; theme=dark" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/auth/me",
      {
        headers: {
          Accept: "application/json",
          Cookie: "laravel_session=abc; theme=dark",
        },
        cache: "no-store",
      },
    );
  });

  it("returns the parsed identity and forwards upstream set-cookie", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(identityResponse, {
        headers: { "set-cookie": "laravel_session=refreshed; Path=/; HttpOnly" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      identityIdentifier: identityResponse.identityIdentifier,
      username: "member",
    });
    expect(response.headers.get("set-cookie")).toContain("laravel_session=refreshed");
  });

  it("preserves upstream 401 status and message", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message: "Session expired." }, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe("Session expired.");
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { message: "database failed at internal.identity.example.test" },
        { status: 500 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });

  it("returns 502 when the upstream identity payload does not match the schema", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ username: "member" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API response did not match the expected schema.");
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://internal.identity.example.test");
    const fetchMock = vi.fn().mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND internal.identity.example.test"),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });
});
