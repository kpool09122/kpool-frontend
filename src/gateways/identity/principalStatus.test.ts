import { describe, expect, it } from "vitest";
import {
  canManagePrincipalGroups,
  hasAccountPolicy,
} from "../account/accountPolicy";
import { canManageSiteManagementPrincipalGroups } from "../site-management/siteManagementPolicy";
import {
  canManageWikiPrincipalGroups,
  wikiPrincipalSummarySchema,
} from "../wiki/wikiPrincipal";
import { parseAuthenticatedIdentitySummary } from "./identityApi";

const identity = {
  identityIdentifier: "actor",
  identityName: "Admin",
  email: "a@example.test",
  language: "ja",
  account: { status: "active" },
  accountIdentifier: "account",
  accountPrincipalStatus: "active" as const,
  siteManagementPrincipalStatus: "active" as const,
  siteManagementPrincipalIdentifier: "site",
  accountPolicies: [
    {
      policyIdentifier: "p",
      name: "Manager",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["account:principal-group:manage"],
          resourceTypes: ["ACCOUNT"],
          condition: null,
        },
      ],
    },
  ],
  siteManagementPolicies: [
    {
      policyIdentifier: "p",
      name: "Admin",
      statements: [
        {
          effect: "allow",
          actions: ["principal-group:manage"],
          resourceTypes: ["principal_group"],
          condition: null,
        },
      ],
    },
  ],
};
const wiki = {
  principalIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: "22222222-2222-4222-8222-222222222222",
  accountIdentifier: "33333333-3333-4333-8333-333333333333",
  accountPrincipalCount: 2,
  isDelegatedPrincipal: false,
  status: "active" as const,
  policies: [
    {
      policyIdentifier: "44444444-4444-4444-8444-444444444444",
      name: "Admin",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["principal-group:manage"],
          resourceTypes: ["principal_group"],
          condition: null,
        },
      ],
    },
  ],
};
describe("Principal status authorization", () => {
  it.each(["active", "suspended", "forced_stop", null] as const)(
    "preserves auth/me Principal status %s independently of Account status",
    (status) => {
      const parsed = parseAuthenticatedIdentitySummary({
        identityIdentifier: "11111111-1111-4111-8111-111111111111",
        identityName: "User",
        email: "a@example.test",
        language: "ja",
        accountIdentifier: null,
        accountPrincipalIdentifier: null,
        accountPrincipalStatus: status,
        siteManagementPrincipalStatus: status,
        accountType: null,
        accountIdentityCount: 0,
        accountPolicies: [],
        account: null,
        originalAccount: null,
        delegationIdentifier: null,
        switchableAccounts: [],
      });
      expect(parsed.accountPrincipalStatus).toBe(status);
      expect(parsed.siteManagementPrincipalStatus).toBe(status);
      expect(parsed.account).toBeNull();
    },
  );
  it.each(["active", "suspended", "forced_stop"] as const)(
    "parses normal and delegated Wiki Principal status %s without legacy fields",
    (status) => {
      for (const isDelegatedPrincipal of [false, true]) {
        const result = wikiPrincipalSummarySchema.safeParse({
          ...wiki,
          status,
          isDelegatedPrincipal,
        });
        expect(result).toMatchObject({
          success: true,
          data: { status, isDelegatedPrincipal },
        });
      }
    },
  );
  it.each(["suspended", "forced_stop", null, undefined, "future"])(
    "fails closed for Account status %s without removing policies",
    (status) => {
      const stopped = { ...identity, accountPrincipalStatus: status };
      expect(canManagePrincipalGroups(stopped)).toBe(false);
      expect(hasAccountPolicy(stopped)).toBe(false);
      if (status !== "future")
        expect(
          canManageSiteManagementPrincipalGroups({
            ...stopped,
            accountPrincipalStatus: status as
              | "suspended"
              | "forced_stop"
              | null
              | undefined,
          }),
        ).toBe(false);
    },
  );
  it.each(["suspended", "forced_stop", null, undefined] as const)(
    "fails closed for SiteManagement status %s",
    (status) => {
      expect(
        canManageSiteManagementPrincipalGroups({
          ...identity,
          siteManagementPrincipalStatus: status,
        }),
      ).toBe(false);
    },
  );
  it.each(["suspended", "forced_stop"] as const)(
    "does not authorize stopped Wiki principal %s",
    (status) => {
      expect(canManageWikiPrincipalGroups({ ...wiki, status })).toBe(false);
    },
  );
  it("parses status-only Wiki responses and rejects missing/unknown status", () => {
    expect(wikiPrincipalSummarySchema.safeParse(wiki).success).toBe(true);
    expect(
      wikiPrincipalSummarySchema.safeParse({ ...wiki, status: undefined })
        .success,
    ).toBe(false);
    expect(
      wikiPrincipalSummarySchema.safeParse({ ...wiki, status: "future" })
        .success,
    ).toBe(false);
  });
});
