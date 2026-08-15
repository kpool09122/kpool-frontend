import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const affiliationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const affiliationResponse = {
  affiliationIdentifier: affiliationId,
  agencyAccountIdentifier: "22222222-2222-4222-8222-222222222222",
  talentAccountIdentifier: "33333333-3333-4333-8333-333333333333",
  requestedBy: "44444444-4444-4444-8444-444444444444",
  status: "active",
  terms: null,
  requestedAt: "2026-08-11T00:00:00Z",
  activatedAt: "2026-08-12T00:00:00Z",
  terminatedAt: null,
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/account/affiliations/${affiliationId}/approve`, { method: "POST", headers }) as NextRequest;

describe("/api/account/affiliations/[affiliationId]/approve route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards approve requests and returns the parsed affiliation", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(affiliationResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ cookie: "laravel_session=abc" }), { params: Promise.resolve({ affiliationId }) });

    expect(fetchMock).toHaveBeenCalledWith(`https://account.example.test/api/account/affiliations/${affiliationId}/approve`, {
      method: "POST",
      headers: { Accept: "application/json", Cookie: "laravel_session=abc" },
      cache: "no-store",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(affiliationResponse);
  });
});
