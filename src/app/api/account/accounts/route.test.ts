import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const createAccountRequestBody = {
  email: "new-member@example.com",
  accountType: "individual",
  accountName: "New Member Account",
  identityIdentifier: null,
};

const createRequest = (
  body: unknown = createAccountRequestBody,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request("https://app.example.test/api/account/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/account/accounts route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the create account body and request headers to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
        email: "new-member@example.com",
        type: "individual",
        name: "New Member Account",
        status: "active",
        accountCategory: "standard",
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(createRequest(createAccountRequestBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/accounts",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(createAccountRequestBody),
        cache: "no-store",
      },
    );
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: "database failed at internal.account.example.test" }),
          { status: 500 },
        ),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://internal.account.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("getaddrinfo ENOTFOUND internal.account.example.test"),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
  });
});
