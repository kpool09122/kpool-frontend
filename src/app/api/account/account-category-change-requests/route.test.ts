import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const requestSummary = {
  requestIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  accountIdentifier: "44444444-4444-4444-8444-444444444444",
  currentAccountCategory: "general",
  requestedAccountCategory: "agency",
  status: "pending",
  requestedAt: "2026-08-11T00:00:00Z",
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  account: {
    accountIdentifier: "44444444-4444-4444-8444-444444444444",
    email: "member@example.com",
    type: "corporation",
    name: "Member Account",
    status: "active",
    accountCategory: "general",
    phone: null,
    address: null,
  },
};

const listResponse = {
  requests: [requestSummary],
  current_page: 1,
  last_page: 1,
  total: 1,
  per_page: 20,
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/account/account-category-change-requests?status=pending&page=1&perPage=20", { headers }) as NextRequest;

describe("/api/account/account-category-change-requests route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards pending list requests with Cookie and Accept-Language", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(listResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest({ "accept-language": "ja", cookie: "session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith(new URL("https://account.example.test/api/account/account-category-change-requests?status=pending&perPage=20&page=1"), {
      method: "GET",
      headers: { Accept: "application/json", "Accept-Language": "ja", Cookie: "session=abc" },
      cache: "no-store",
    });
    await expect(response.json()).resolves.toEqual(listResponse);
  });

  it("returns 502 for schema mismatches", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ requests: [{}] }), { status: 200 })));

    const response = await GET(createRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "Account API response did not match the expected schema." });
  });
});
