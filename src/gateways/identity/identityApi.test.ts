import { describe, expect, it } from "vitest";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
  parseAuthenticatedIdentitySummary,
  withIdentityApiPrefix,
} from "./identityApi";

describe("identity API helpers", () => {
  it("adds the backend identity prefix when the base URL omits it", () => {
    expect(withIdentityApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/identity",
    );
    expect(withIdentityApiPrefix("http://127.0.0.1:8080/api/identity")).toBe(
      "http://127.0.0.1:8080/api/identity",
    );
  });

  it("uses the server-only env var for the Identity API base URL", () => {
    expect(getIdentityApiBaseUrl({ KPOOL_IDENTITY_API_BASE_URL: "http://api.test" })).toBe(
      "http://api.test/api/identity",
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
    ).toBe("Identity API is temporarily unavailable.");
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
      accountType: null,
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
      accountType: null,
      accountPolicies: [policy],
      account: null,
      originalAccount: null,
      delegationIdentifier: null,
      switchableAccounts: [],
    }).accountPolicies).toEqual([policy]);
  });
});
