import { describe, expect, it } from "vitest";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { getAdminInitialRoute, getAdminNavigation, resolveAdminDestination } from "./adminNavigation";

const identity: AuthenticatedIdentitySummary = {
  identityIdentifier: "user", identityName: "User", email: "user@example.test", language: "ja",
  account: { status: "active" }, accountIdentifier: "account", accountPrincipalStatus: "active",
  wikiPrincipalStatus: "active", siteManagementPrincipalStatus: "active", siteManagementPrincipalIdentifier: "site-user",
  accountPolicies: [{ policyIdentifier: "account-policy", name: "Account", isSystemPolicy: true, statements: [] }],
  siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Site", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }],
};

describe("admin navigation and initial destination", () => {
  it.each([
    [{}, ["wiki", "siteManagement", "accountSettings", "settings"], "/admin/wiki/editing"],
    [{ wikiPrincipalStatus: "suspended" }, ["siteManagement", "accountSettings", "settings"], "/admin/site-management/contacts"],
    [{ wikiPrincipalStatus: "forced_stop", siteManagementPrincipalStatus: "suspended" }, ["accountSettings", "settings"], "/admin/account/profile"],
    [{ wikiPrincipalStatus: "suspended", siteManagementPrincipalStatus: "forced_stop", accountPolicies: [] }, ["settings"], "/admin/user/profile"],
    [{ accountPrincipalStatus: "suspended" }, ["settings"], "/admin/user/profile"],
    [{ account: { status: "suspended" } }, ["settings"], "/admin/user/profile"],
  ] as const)("uses the first visible section for %j", (overrides, sections, route) => {
    const current = { ...identity, ...overrides } as AuthenticatedIdentitySummary;
    expect(getAdminNavigation(current).map((item) => item.section)).toEqual(sections);
    expect(getAdminInitialRoute(current)).toBe(route);
    expect(resolveAdminDestination(current, "/admin")).toBe(route);
  });

  it.each([null, undefined])("retains the Wiki activation entry before first use: %s", (wikiPrincipalStatus) => {
    const current = { ...identity, wikiPrincipalStatus };
    expect(getAdminNavigation(current)[0].section).toBe("wiki");
    expect(getAdminInitialRoute(current)).toBe("/admin/wiki/editing");
  });

  it("skips a hidden return destination while preserving visible deep links and public pages", () => {
    const stoppedWiki = { ...identity, wikiPrincipalStatus: "suspended" as const };
    expect(resolveAdminDestination(stoppedWiki, "/admin/wiki/submitted")).toBe("/admin/site-management/contacts");
    expect(resolveAdminDestination(stoppedWiki, "/admin/account/documents?page=2")).toBe("/admin/account/documents?page=2");
    expect(resolveAdminDestination(stoppedWiki, "/admin/user/security?step=1")).toBe("/admin/user/security?step=1");
    expect(resolveAdminDestination(stoppedWiki, "/admin?returnTo=%2Fja%2Fwiki%2Fexample")).toBe("/admin?returnTo=%2Fja%2Fwiki%2Fexample");
    expect(resolveAdminDestination(stoppedWiki, "/ja/wiki/example")).toBe("/ja/wiki/example");
  });
});
