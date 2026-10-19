import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAuthenticatedIdentity } from "./authIdentity";

describe("fetchAuthenticatedIdentity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when the Identity API is not configured", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "");

    await expect(
      fetchAuthenticatedIdentity({ cookieHeader: "laravel_session=abc" }),
    ).resolves.toBeNull();
  });

  it("fetches the authenticated identity through /auth/me", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "http://api.test");
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          identityIdentifier: "11111111-1111-1111-1111-111111111111",
          identityName: "member",
          email: "member@example.com",
          language: "ja",
          accountIdentifier: null,
          accountPrincipalIdentifier: null,
          accountPrincipalStatus: null,
          siteManagementPrincipalStatus: "active" as const,
          siteManagementPrincipalIdentifier: "55555555-5555-4555-8555-555555555555",
          accountType: null,
          accountIdentityCount: 0,
          accountPolicies: [],
          account: null,
          originalAccount: null,
          delegationIdentifier: null,
          switchableAccounts: [],
        }),
        { status: 200 },
      ),
    );

    await expect(
      fetchAuthenticatedIdentity({
        cookieHeader: "laravel_session=abc",
        fetchAdapter,
      }),
    ).resolves.toMatchObject({
      identityName: "member",
      email: "member@example.com",
      siteManagementPrincipalIdentifier: "55555555-5555-4555-8555-555555555555",
    });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "http://api.test/api/v1/identity/auth/me",
      {
        headers: {
          Accept: "application/json",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
  });

  it("supplies announcement policies only for the explicit mock operator cookie", async () => {
    vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "1");
    const identity = await fetchAuthenticatedIdentity({ cookieHeader: "kpool-mock-account-status=active; kpool-e2e-site-management=operator" });
    expect(identity?.siteManagementPolicies?.[0].statements[0].actions).toContain("announcement:view-draft");
  });
  it("supplies SiteManagement policies only for the explicit mock admin cookie", async () => {
    vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "1");
    const identity = await fetchAuthenticatedIdentity({ cookieHeader: "kpool-mock-account-status=active; kpool-e2e-site-management=administrator" });
    expect(identity?.siteManagementPolicies?.[0].statements[0]).toMatchObject({ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null });
    const denied = await fetchAuthenticatedIdentity({ cookieHeader: "kpool-mock-account-status=active" });
    expect(denied?.siteManagementPolicies ?? []).toEqual([]);
  });

  it("returns null when /auth/me rejects the session", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "http://api.test");
    const fetchAdapter = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(
      fetchAuthenticatedIdentity({
        cookieHeader: "laravel_session=expired",
        fetchAdapter,
      }),
    ).resolves.toBeNull();
  });
});
