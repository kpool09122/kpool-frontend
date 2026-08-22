import { describe, expect, it, vi } from "vitest";

import {
  fetchWikiPrincipalGroups,
  updateWikiPrincipalGroupMembers,
} from "./wikiPrincipalGroups";

const listResponse = {
  principalGroups: [
    {
      principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
      accountIdentifier: "22222222-2222-4222-8222-222222222222",
      name: "Wiki Editors",
      roleIdentifiers: [],
      isDefault: false,
      members: [
        {
          principalIdentifier: "11111111-1111-4111-8111-111111111111",
          identityIdentifier: "44444444-4444-4444-8444-444444444444",
          identityName: "編集者",
          email: "editor@example.com",
        },
      ],
    },
  ],
};

describe("wiki principal group browser API", () => {
  it("fetches wiki principal groups with credentials and account identifier", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(listResponse),
    });

    await expect(fetchWikiPrincipalGroups({
      accountIdentifier: "22222222-2222-4222-8222-222222222222",
      fallbackErrorMessage: "failed",
      fetchAdapter,
    })).resolves.toEqual(listResponse);

    expect(fetchAdapter).toHaveBeenCalledWith(
      "/api/wiki/principal-groups?accountIdentifier=22222222-2222-4222-8222-222222222222",
      {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
  });

  it("updates members only through the batch principalGroups payload", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(listResponse),
    });
    const requestBody = {
      principalGroups: [
        {
          principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
          principalIdentifiers: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
    };

    await expect(updateWikiPrincipalGroupMembers({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      requestBody,
    })).resolves.toEqual(listResponse);

    expect(fetchAdapter).toHaveBeenCalledWith("/api/wiki/principal-groups/members", {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  });
});
