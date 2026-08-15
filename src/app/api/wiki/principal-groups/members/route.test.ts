import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { PATCH } from "./route";

const updateRequest = {
  principalGroups: [
    {
      principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
      principalIdentifiers: ["11111111-1111-4111-8111-111111111111"],
    },
  ],
};

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

const createRequest = (body: unknown = updateRequest, headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/wiki/principal-groups/members", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/wiki/principal-groups/members route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards batch member updates to the Wiki private API", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(createRequest(updateRequest, { "accept-language": "ko", cookie: "session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith("https://wiki.example.test/api/wiki/principal-groups/members", {
      method: "PATCH",
      headers: { Accept: "application/json", "Accept-Language": "ko", Cookie: "session=abc", "Content-Type": "application/json" },
      body: JSON.stringify(updateRequest),
      cache: "no-store",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
  });

  it("rejects invalid request bodies without calling upstream", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(createRequest({ principalGroups: [{ principalGroupIdentifier: "33333333-3333-4333-8333-333333333333" }] }));

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
