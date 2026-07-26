import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const principalGroupsResponse = {
  principalGroups: [
    {
      principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
      accountIdentifier: "44444444-4444-4444-8444-444444444444",
      name: "Managers",
      roleIdentifiers: [],
      isDefault: false,
      members: [],
    },
  ],
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/account/principal-groups", { headers }) as NextRequest;

describe("/api/account/principal-groups route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards list requests to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(principalGroupsResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest({ "accept-language": "en", cookie: "session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith("https://account.example.test/api/account/principal-groups", {
      method: "GET",
      headers: { Accept: "application/json", "Accept-Language": "en", Cookie: "session=abc" },
      cache: "no-store",
    });
    await expect(response.json()).resolves.toEqual(principalGroupsResponse);
  });

  it("returns 502 for schema mismatches", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ principalGroups: [{ name: "broken" }] }), { status: 200 })));

    const response = await GET(createRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "Account API response did not match the expected schema." });
  });
});
