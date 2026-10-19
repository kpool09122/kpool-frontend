import { describe, expect, it } from "vitest";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
  parseAuthenticatedIdentitySummary,
  withIdentityApiPrefix,
} from "./identityApi";

describe("identity API helpers", () => {
  it.each(["active", "suspended", "forced_stop", null] as const)("preserves Wiki principal status %s", (wikiPrincipalStatus) => {
    const result = parseAuthenticatedIdentitySummary({ identityIdentifier: "11111111-1111-4111-8111-111111111111", identityName: "user", email: "user@example.test", language: "ja", accountIdentifier: null, accountPrincipalIdentifier: null, accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", wikiPrincipalStatus, accountType: null, accountIdentityCount: 0, accountPolicies: [], account: null, originalAccount: null, delegationIdentifier: null, switchableAccounts: [] });
    expect(result.wikiPrincipalStatus).toBe(wikiPrincipalStatus);
    expect(result.accountPrincipalStatus).toBe("active");
    expect(result.siteManagementPrincipalStatus).toBe("active");
  });

  it("preserves generated SiteManagement policies independently of Account policies", () => {
    const siteManagementPolicies = [{ policyIdentifier: "33333333-3333-4333-8333-333333333333", name: "Administrator", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }];
    const result = parseAuthenticatedIdentitySummary({ identityIdentifier: "11111111-1111-4111-8111-111111111111", identityName: "admin", email: "admin@example.test", language: "ja", accountIdentifier: null, accountPrincipalIdentifier: null, accountPrincipalStatus: null, siteManagementPrincipalStatus: null, accountType: null, accountIdentityCount: 0, accountPolicies: [], account: null, originalAccount: null, delegationIdentifier: null, switchableAccounts: [], siteManagementPolicies, siteManagementPrincipalCount: 2 });
    expect(result.siteManagementPrincipalCount).toBe(2);
    for (const count of [-1, 1.5]) expect(() => parseAuthenticatedIdentitySummary({ ...result, siteManagementPrincipalCount: count })).toThrow();
    expect(result.siteManagementPolicies).toEqual(siteManagementPolicies);
    expect(result.accountPolicies).toEqual([]);
    expect(() => parseAuthenticatedIdentitySummary({ ...result, siteManagementPolicies: [{ ...siteManagementPolicies[0], statements: [{ ...siteManagementPolicies[0].statements[0], condition: { clauses: [] } }] }] })).toThrow();
  });
  it.each([
    "55555555-5555-4555-8555-555555555555",
    null,
    undefined,
  ])("preserves the site management principal context: %s", (principalIdentifier) => {
    const identity = parseAuthenticatedIdentitySummary({
      identityIdentifier: "11111111-1111-4111-8111-111111111111",
      identityName: "member",
      email: "member@example.com",
      language: "ja",
      accountIdentifier: null,
      accountPrincipalIdentifier: null,
      accountPrincipalStatus: null,
      siteManagementPrincipalStatus: "active" as const,
      siteManagementPrincipalIdentifier: principalIdentifier,
      accountType: null,
      accountIdentityCount: 0,
      accountPolicies: [],
      account: null,
      originalAccount: null,
      delegationIdentifier: null,
      switchableAccounts: [],
    });

    expect(identity.siteManagementPrincipalIdentifier).toBe(principalIdentifier);
  });

  it("adds the backend identity prefix when the base URL omits it", () => {
    expect(withIdentityApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/v1/identity",
    );
    expect(withIdentityApiPrefix("http://127.0.0.1:8080/api/v1/identity")).toBe(
      "http://127.0.0.1:8080/api/v1/identity",
    );
  });

  it("uses the server-only env var for the Identity API base URL", () => {
    expect(getIdentityApiBaseUrl({ KPOOL_IDENTITY_API_BASE_URL: "http://api.test" })).toBe(
      "http://api.test/api/v1/identity",
    );
  });

  it("converts problem details into route error messages", () => {
    expect(
      getIdentityRouteErrorMessage({
        status: 401,
        data: { detail: "Invalid credentials." },
      }),
    ).toBe("Invalid credentials.");
    expect(getIdentityRouteErrorMessage({ status: 500, data: {} })).toBe(
      "Identity API is temporarily unavailable.",
    );
    expect(
      getIdentityRouteErrorMessage({
        status: 500,
        data: { message: "database failed at internal.identity.example.test" },
      }),
    ).toBe("database failed at internal.identity.example.test");
  });

  it("parses account switching context from the authenticated identity", () => {
    const switchableAccount = {
      delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountIdentifier: "22222222-2222-4222-8222-222222222222",
      account: {
        accountIdentifier: "22222222-2222-4222-8222-222222222222",
        name: "Aurora Agency",
      },
      isCurrent: false,
    };

    expect(parseAuthenticatedIdentitySummary({
      identityIdentifier: "11111111-1111-4111-8111-111111111111",
      identityName: "member",
      email: "member@example.com",
      language: "ja",
      accountIdentifier: null,
      accountPrincipalIdentifier: null,
      accountPrincipalStatus: null,
      siteManagementPrincipalStatus: "active" as const,
      accountType: null,
      accountIdentityCount: 0,
      accountPolicies: [],
      account: null,
      originalAccount: null,
      delegationIdentifier: null,
      switchableAccounts: [switchableAccount],
    }).switchableAccounts).toEqual([switchableAccount]);
  });

  it("parses account policy condition values with string arrays", () => {
    const policy = {
      policyIdentifier: "33333333-3333-4333-8333-333333333333",
      name: "Affiliation reviewers",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["account:affiliation-request:approve"],
          resourceTypes: ["ACCOUNT"],
          condition: {
            clauses: [
              {
                field: "resource:accountCategory",
                operator: "in",
                value: ["agency", "talent"],
              },
            ],
          },
        },
      ],
    };

    expect(parseAuthenticatedIdentitySummary({
      identityIdentifier: "11111111-1111-4111-8111-111111111111",
      identityName: "member",
      email: "member@example.com",
      language: "ja",
      accountIdentifier: null,
      accountPrincipalIdentifier: null,
      accountPrincipalStatus: null,
      siteManagementPrincipalStatus: "active" as const,
      accountType: null,
      accountIdentityCount: 0,
      accountPolicies: [policy],
      account: null,
      originalAccount: null,
      delegationIdentifier: null,
      switchableAccounts: [],
    }).accountPolicies).toEqual([policy]);
  });
});
