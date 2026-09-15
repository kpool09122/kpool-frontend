import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const delegationIdentifier = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const switchResponse = {
  originalIdentityIdentifier: "11111111-1111-4111-8111-111111111111",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  delegationIdentifier,
};

const createRequest = (body: unknown): NextRequest => new Request(
  "https://app.example.test/api/account/accounts/switch",
  {
    method: "POST",
    headers: {
      "accept-language": "ja",
      "content-type": "application/json",
      cookie: "laravel_session=abc",
    },
    body: JSON.stringify(body),
  },
) as NextRequest;

describe("POST /api/account/accounts/switch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    { label: "delegated account", value: delegationIdentifier },
    { label: "original account", value: null },
  ])("forwards cookies, language, and the $label request", async ({ value }) => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test/");
    const responseBody = { ...switchResponse, delegationIdentifier: value };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ delegationIdentifier: value }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/accounts/switch",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify({ delegationIdentifier: value }),
        cache: "no-store",
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
  });

  it("rejects an invalid request without calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ delegationIdentifier: 123 }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid account switch request.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 422])("preserves a %s upstream error", async (status) => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "switch denied" }), { status }),
    ));

    const response = await POST(createRequest({ delegationIdentifier }));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ message: "switch denied" });
  });

  it("hides upstream 5xx details", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "database failure" }), { status: 500 }),
    ));

    const response = await POST(createRequest({ delegationIdentifier }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Account API is temporarily unavailable.",
    });
  });

  it("returns 502 when a success response violates the schema", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accountIdentifier: "invalid" }), { status: 200 }),
    ));

    const response = await POST(createRequest({ delegationIdentifier }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid account switch response.",
    });
  });
});
