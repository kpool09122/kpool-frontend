import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET, PATCH } from "./route";

const accountId = "22222222-2222-2222-2222-222222222222";

const createRequest = (
  method: "GET" | "PATCH" = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request(`https://app.example.test/api/account/accounts/${accountId}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as NextRequest;

const context = {
  params: Promise.resolve({ accountId }),
};

describe("/api/account/accounts/[accountId] route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards GET with Cookie and Accept-Language headers", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accountIdentifier: accountId,
      email: "member@example.com",
      type: "individual",
      name: "Member Account",
      status: "active",
      accountCategory: "standard",
    })));
    vi.stubGlobal("fetch", fetchMock);

    await GET(createRequest("GET", undefined, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }), context);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/accounts/22222222-2222-2222-2222-222222222222",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
  });

  it("forwards PATCH accountName only to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accountIdentifier: accountId,
      email: "member@example.com",
      type: "individual",
      name: "Updated Account",
      status: "active",
      accountCategory: "standard",
    })));
    vi.stubGlobal("fetch", fetchMock);

    await PATCH(createRequest("PATCH", { accountName: "Updated Account" }, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }), context);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/accounts/22222222-2222-2222-2222-222222222222",
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify({ accountName: "Updated Account" }),
        cache: "no-store",
      },
    );
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "database failed at internal.account.example.test" }), { status: 500 }),
    ));

    const response = await GET(createRequest(), context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
  });
});
