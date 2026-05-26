import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const verifyEmailRequestBody = {
  email: "new-member@example.com",
  authCode: "123456",
};

const createRequest = (
  body: unknown = verifyEmailRequestBody,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request("https://app.example.test/api/identity/auth/verify-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/identity/auth/verify-email route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the verification body and request headers to upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        email: "new-member@example.com",
        verifiedAt: "2026-05-05T00:00:00+00:00",
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(createRequest(verifyEmailRequestBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/auth/verify-email",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(verifyEmailRequestBody),
        cache: "no-store",
      },
    );
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://internal.identity.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("TLS failed for internal.identity.example.test"),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });
});
