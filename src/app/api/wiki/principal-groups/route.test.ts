import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const responseBody = {
  principalGroups: [
    {
      principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
      accountIdentifier: "22222222-2222-4222-8222-222222222222",
      name: "Wiki Editors",
      roleIdentifiers: [],
      isDefault: false,
      members: [],
    },
  ],
};

const createRequest = (accountIdentifier = "22222222-2222-4222-8222-222222222222", headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/principal-groups?accountIdentifier=${accountIdentifier}`, {
    headers,
  }) as NextRequest;

describe("/api/wiki/principal-groups route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards list requests to the Wiki private API", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest("22222222-2222-4222-8222-222222222222", { "accept-language": "ja", cookie: "session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith("https://wiki.example.test/api/wiki/principal-groups?accountIdentifier=22222222-2222-4222-8222-222222222222", {
      method: "GET",
      headers: { Accept: "application/json", "Accept-Language": "ja", Cookie: "session=abc" },
      cache: "no-store",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
  });

  it("rejects invalid accountIdentifier without calling upstream", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest("not-a-uuid"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose upstream server details", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "database at internal host failed" }), { status: 500 })));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Wiki principal groups are temporarily unavailable. Please try again later.");
  });
});
