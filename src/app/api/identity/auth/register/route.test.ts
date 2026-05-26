import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const registerRequestBody = {
  username: "New Member",
  email: "new-member@example.com",
  password: "secret-password",
  confirmedPassword: "secret-password",
  base64EncodedImage: null,
  invitationToken: null,
  requestLanguage: "ja",
};

const createRequest = (
  body: unknown = registerRequestBody,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request("https://app.example.test/api/identity/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/identity/auth/register route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the create identity body and request headers to upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "New Member",
        email: "new-member@example.com",
        language: "ja",
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(createRequest(registerRequestBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/auth/register",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(registerRequestBody),
        cache: "no-store",
      },
    );
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://internal.identity.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("connect ECONNREFUSED internal.identity.example.test"),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });
});
