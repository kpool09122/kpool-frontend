import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const membersResponse = {
  members: [
    {
      principalIdentifier: "11111111-1111-4111-8111-111111111111",
      identityIdentifier: "22222222-2222-4222-8222-222222222222",
      identityName: "member",
      email: "member@example.com",
      principalGroups: [],
    },
  ],
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/account/members", { headers }) as NextRequest;

describe("/api/account/members route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards cookie and Accept-Language to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(membersResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest({ "accept-language": "ja", cookie: "session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith("https://account.example.test/api/account/members", {
      method: "GET",
      headers: { Accept: "application/json", "Accept-Language": "ja", Cookie: "session=abc" },
      cache: "no-store",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(membersResponse);
  });

  it("masks upstream 500 details", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "internal host" }), { status: 500 })));

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "Account API is temporarily unavailable." });
  });
});
