import { describe, expect, it } from "vitest";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import type { WikiPrincipalState, WikiPrincipalSummary } from "@/gateways/wiki/wikiPrincipal";
import { getAdminInitialRoute, getAdminNavigation, resolveAdminDestination } from "./adminNavigation";

const identity: AuthenticatedIdentitySummary = {
  identityIdentifier: "user", identityName: "User", email: "user@example.test", language: "ja",
  account: { status: "active" }, accountIdentifier: "account", accountPrincipalStatus: "active",
  siteManagementPrincipalStatus: "active", siteManagementPrincipalIdentifier: "site-user",
  accountPolicies: [{ policyIdentifier: "account-policy", name: "Account", isSystemPolicy: true, statements: [] }],
  siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Site", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }],
};
const principalState = (status: WikiPrincipalSummary["status"]): WikiPrincipalState => ({
  status: "available", principal: { principalIdentifier: "wiki-user", identityIdentifier: "user", status, policies: [], accountPrincipalCount: 1, isDelegatedPrincipal: false },
});

describe("admin navigation and initial destination", () => {
  it.each([
    [{}, "active", ["wiki", "siteManagement", "accountSettings", "settings"], "/admin/wiki/editing"],
    [{}, "suspended", ["siteManagement", "accountSettings", "settings"], "/admin/site-management/contacts"],
    [{ siteManagementPrincipalStatus: "suspended" }, "forced_stop", ["accountSettings", "settings"], "/admin/account/profile"],
    [{ siteManagementPrincipalStatus: "forced_stop", accountPolicies: [] }, "suspended", ["settings"], "/admin/user/profile"],
    [{ accountPrincipalStatus: "suspended" }, "active", ["settings"], "/admin/user/profile"],
    [{ account: { status: "suspended" } }, "active", ["settings"], "/admin/user/profile"],
  ] as const)("uses the first visible section for %j / Wiki %s", (overrides, status, sections, route) => {
    const current = { ...identity, ...overrides } as AuthenticatedIdentitySummary;
    const state = principalState(status);
    expect(getAdminNavigation(current, state).map((item) => item.section)).toEqual(sections);
    expect(getAdminInitialRoute(current, state)).toBe(route);
    expect(resolveAdminDestination(current, "/admin", state)).toBe(route);
  });

  it("retains the Wiki activation entry before first use", () => {
    expect(getAdminNavigation(identity, { status: "missing" })[0].section).toBe("wiki");
    expect(getAdminInitialRoute(identity, { status: "missing" })).toBe("/admin/wiki/editing");
  });

  it("skips a hidden return destination while preserving visible deep links and public pages", () => {
    const state = principalState("suspended");
    expect(resolveAdminDestination(identity, "/admin/wiki/submitted", state)).toBe("/admin/site-management/contacts");
    expect(resolveAdminDestination(identity, "/admin/account/documents?page=2", state)).toBe("/admin/account/documents?page=2");
    expect(resolveAdminDestination(identity, "/admin/user/security?step=1", state)).toBe("/admin/user/security?step=1");
    expect(resolveAdminDestination(identity, "/admin?returnTo=%2Fja%2Fwiki%2Fexample", state)).toBe("/admin?returnTo=%2Fja%2Fwiki%2Fexample");
    expect(resolveAdminDestination(identity, "/ja/wiki/example", state)).toBe("/ja/wiki/example");
  });
});
