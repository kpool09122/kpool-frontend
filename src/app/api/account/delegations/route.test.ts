import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const targetAccountIdentifier = "33333333-3333-4333-8333-333333333333";
const delegationResponse = {
  delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  affiliationIdentifier: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  delegateAccountIdentifier: "22222222-2222-4222-8222-222222222222",
  delegatorAccountIdentifier: targetAccountIdentifier,
  requestedByAccountIdentifier: "22222222-2222-4222-8222-222222222222",
  status: "pending",
  direction: "agency_to_talent",
  requestedAt: "2026-09-12T00:00:00Z",
  approvedAt: null,
  revokedAt: null,
};

const createRequest = (body: unknown): NextRequest => new Request(
  "https://app.example.test/api/account/delegations",
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

describe("POST /api/account/delegations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("validates with the generated schema and forwards only the target account identifier", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(delegationResponse), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({
      targetAccountIdentifier,
      accountIdentifier: "not-forwarded",
      affiliationIdentifier: "not-forwarded",
      identityIdentifier: "not-forwarded",
    }));

    expect(fetchMock).toHaveBeenCalledWith("https://account.example.test/api/account/delegations", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja",
        "Content-Type": "application/json",
        Cookie: "laravel_session=abc",
      },
      body: JSON.stringify({ targetAccountIdentifier }),
      cache: "no-store",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(delegationResponse);
  });

  it("rejects an invalid target without calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ targetAccountIdentifier: 123 }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ message: "Invalid account delegation request." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the upstream success response violates the generated schema", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "pending" }), { status: 201 })));

    const response = await POST(createRequest({ targetAccountIdentifier }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "Account API is temporarily unavailable." });
  });

  it("preserves authorization and conflict statuses while hiding server errors", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "already requested" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "database failure" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const forbidden = await POST(createRequest({ targetAccountIdentifier }));
    const conflict = await POST(createRequest({ targetAccountIdentifier }));
    const serverError = await POST(createRequest({ targetAccountIdentifier }));

    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ message: "forbidden" });
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({ message: "already requested" });
    expect(serverError.status).toBe(500);
    await expect(serverError.json()).resolves.toEqual({ message: "Account API is temporarily unavailable." });
  });
});
