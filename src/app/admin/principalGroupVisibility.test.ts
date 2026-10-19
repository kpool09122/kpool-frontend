import { describe, expect, it } from "vitest";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import type { WikiPrincipalSummary } from "@/gateways/wiki/wikiPrincipal";
import { canShowAccountPrincipalGroupManagement, canShowWikiPrincipalGroupManagement, canShowSiteManagementPrincipalGroupManagement } from "./principalGroupVisibility";

const identity: AuthenticatedIdentitySummary = { accountPrincipalStatus: "active" as const, siteManagementPrincipalStatus: "active" as const,
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountType: "individual",
  accountIdentityCount: 2,
  accountPolicies: [{
    policyIdentifier: "22222222-2222-4222-8222-222222222222",
    name: "ACCOUNT_PRINCIPAL_GROUP_MANAGE",
    isSystemPolicy: true,
    statements: [{ effect: "allow", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"], condition: null }],
  }],
};
const principal: WikiPrincipalSummary = {
  principalIdentifier: "33333333-3333-4333-8333-333333333333",
  identityIdentifier: identity.identityIdentifier,
  status: "active" as const,
  isDelegatedPrincipal: false,
  accountPrincipalCount: 2,
  policies: [{
    policyIdentifier: "44444444-4444-4444-8444-444444444444",
    name: "GLOBAL_PRINCIPAL_GROUP_MANAGE",
    isSystemPolicy: true,
    statements: [{ effect: "allow", actions: ["principal-group-manage"], resourceTypes: ["principal_group"], condition: null }],
  }],
};

describe("principal group menu visibility", () => {
  const siteIdentity: AuthenticatedIdentitySummary = {
    ...identity,
    accountIdentifier: "22222222-2222-4222-8222-222222222222",
    account: { status: "active" },
    siteManagementPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
    siteManagementPolicies: [{
      policyIdentifier: "44444444-4444-4444-8444-444444444444",
      name: "Administrator",
      statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }],
    }],
  };
  it.each([undefined, 0, 1, 2, 3])("uses site management principal count independently of account members: %s", (count) => {
    expect(canShowSiteManagementPrincipalGroupManagement({ ...siteIdentity, accountIdentityCount: 10, siteManagementPrincipalCount: count })).toBe((count ?? 0) >= 2);
  });
  it("hides site permissions without a grant or for a suspended account", () => {
    expect(canShowSiteManagementPrincipalGroupManagement({ ...siteIdentity, siteManagementPrincipalCount: 2, siteManagementPolicies: [] })).toBe(false);
    expect(canShowSiteManagementPrincipalGroupManagement({ ...siteIdentity, siteManagementPrincipalCount: 2, account: { status: "suspended" } })).toBe(false);
  });
  it.each([undefined, 0, 1, 2, 3])("uses account Identity count %s for account permissions", (count) => {
    expect(canShowAccountPrincipalGroupManagement({ ...identity, accountIdentityCount: count })).toBe((count ?? 0) >= 2);
  });
  it.each(["individual", "corporation"])("allows both account types with two members and permission: %s", (accountType) => {
    expect(canShowAccountPrincipalGroupManagement({ ...identity, accountType })).toBe(true);
  });
  it("hides account permissions without a grant or when denied", () => {
    expect(canShowAccountPrincipalGroupManagement({ ...identity, accountPolicies: [] })).toBe(false);
    expect(canShowAccountPrincipalGroupManagement({ ...identity, accountPolicies: [
      ...identity.accountPolicies!,
      { ...identity.accountPolicies![0], statements: [{ effect: "deny", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"], condition: null }] },
    ] })).toBe(false);
  });
  it.each([1, 2, 3])("uses Wiki principal count %s independently of Identity count", (count) => {
    expect(canShowWikiPrincipalGroupManagement({ ...principal, accountPrincipalCount: count })).toBe(count >= 2);
  });
  it("hides Wiki permissions without a grant or when denied", () => {
    expect(canShowWikiPrincipalGroupManagement({ ...principal, policies: [] })).toBe(false);
    expect(canShowWikiPrincipalGroupManagement({ ...principal, policies: [
      ...principal.policies,
      { ...principal.policies[0], statements: [{ effect: "deny", actions: ["principal-group-manage"], resourceTypes: ["principal_group"], condition: null }] },
    ] })).toBe(false);
  });
});
