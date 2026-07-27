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

const updateResponse = {
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

const createRequest = (body: unknown = updateRequest, headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/account/principal-groups/members", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/account/principal-groups/members route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards final group membership updates to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://account.example.test/api/account/principal-groups/members") {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.resolve(new Response(JSON.stringify(updateResponse), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(createRequest(updateRequest, { "accept-language": "ko", cookie: "session=abc" }));

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://account.example.test/api/account/principal-groups/members", {
      method: "PATCH",
      headers: { Accept: "application/json", "Accept-Language": "ko", "Content-Type": "application/json", Cookie: "session=abc" },
      body: JSON.stringify(updateRequest),
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://account.example.test/api/account/principal-groups", {
      headers: { Accept: "application/json", "Accept-Language": "ko", Cookie: "session=abc" },
      cache: "no-store",
    });
    await expect(response.json()).resolves.toEqual(updateResponse);
  });

  it("rejects invalid request bodies without calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(createRequest({ principalGroups: [{ principalGroupIdentifier: "33333333-3333-4333-8333-333333333333" }] }));

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
