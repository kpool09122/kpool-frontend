import { describe, expect, it, vi } from "vitest";

import { fetchCurrentAuthenticatedIdentity } from "./authIdentityBrowserApi";

const authenticatedIdentity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  accountType: "agency",
  accountPolicies: [],
  account: null,
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [
    {
      delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountIdentifier: "44444444-4444-4444-8444-444444444444",
      account: {
        accountIdentifier: "44444444-4444-4444-8444-444444444444",
        name: "Aurora Agency",
      },
      isCurrent: false,
    },
  ],
};

describe("fetchCurrentAuthenticatedIdentity", () => {
  it("fetches and parses account switching context with credentials", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(authenticatedIdentity), { status: 200 }),
    );

    await expect(fetchCurrentAuthenticatedIdentity({ fetchAdapter })).resolves.toMatchObject({
      switchableAccounts: authenticatedIdentity.switchableAccounts,
    });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/identity/auth/me", {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("returns null for an invalid authenticated identity response", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...authenticatedIdentity, switchableAccounts: null }), {
        status: 200,
      }),
    );

    await expect(fetchCurrentAuthenticatedIdentity({ fetchAdapter })).resolves.toBeNull();
  });
});
