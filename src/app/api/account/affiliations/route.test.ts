import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET, POST } from "./route";

const requestBody = { targetEmail: "talent@example.com" };
const affiliationResponse = {
  affiliationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  agencyAccountIdentifier: "22222222-2222-4222-8222-222222222222",
  talentAccountIdentifier: "33333333-3333-4333-8333-333333333333",
  agencyAccount: {
    accountIdentifier: "22222222-2222-4222-8222-222222222222",
    name: "Agency Account",
    email: "agency@example.com",
  },
  talentAccount: {
    accountIdentifier: "33333333-3333-4333-8333-333333333333",
    name: "Talent Account",
    email: "talent@example.com",
  },
  requestedBy: "44444444-4444-4444-8444-444444444444",
  status: "pending",
  terms: null,
  requestedAt: "2026-08-11T00:00:00Z",
  activatedAt: null,
  terminatedAt: null,
};

const createRequest = (body: unknown = requestBody, headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/account/affiliations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as NextRequest;

const createGetRequest = (url = "https://app.example.test/api/account/affiliations?status=pending&viewerRole=approver", headers: Record<string, string> = {}): NextRequest =>
  new Request(url, { method: "GET", headers }) as NextRequest;

describe("/api/account/affiliations route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards affiliation list requests to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const listResponse = { affiliations: [affiliationResponse], current_page: 1, last_page: 1, total: 1, per_page: 50 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(listResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createGetRequest(undefined, { "accept-language": "ja", cookie: "laravel_session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith("https://account.example.test/api/account/affiliations?status=pending&viewerRole=approver", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja",
        Cookie: "laravel_session=abc",
      },
      cache: "no-store",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(listResponse);
  });

  it("forwards affiliation requests to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(affiliationResponse), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest(requestBody, { "accept-language": "ja", cookie: "laravel_session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith("https://account.example.test/api/account/affiliations", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja",
        "Content-Type": "application/json",
        Cookie: "laravel_session=abc",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(affiliationResponse);
  });

  it("rejects invalid request bodies without calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ targetEmail: 123 }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ message: "Invalid account affiliation request." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
