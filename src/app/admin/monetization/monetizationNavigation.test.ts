import { describe, expect, it } from "vitest";
import { getAdminNavigation, resolveAdminDestination, resolveAdminSection } from "../adminNavigation";
import { resolveAdminClientPage } from "../[[...slug]]/AdminAppClient";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import type { MonetizationState } from "@/gateways/monetization/monetizationPrincipal";
const identity: AuthenticatedIdentitySummary = { identityIdentifier: "actor", identityName: "Actor", email: "actor@example.test", language: "ja", accountIdentifier: "account", account: { status: "active" }, accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", accountPolicies: [], siteManagementPolicies: [] };
describe("Monetization navigation", () => {
 it("keeps the activation entry before enrollment and follows account settings", () => {
  const navigation = getAdminNavigation(identity, { status: "missing" }, { status: "missing" });
  expect(navigation.map(item => item.section)).toEqual(["wiki", "analyze", "monetization", "settings"]);
  expect(getAdminNavigation({ ...identity, accountPolicies: [{ policyIdentifier: "p", name: "Admin", isSystemPolicy: true, statements: [] }] }, { status: "missing" }).map(item => item.section)).toEqual(["wiki", "analyze", "accountSettings", "monetization", "settings"]);
 });
 const available: Extract<MonetizationState, { status: "available" }> = {
  status: "available",
  principal: {
   principalIdentifier: "principal", identityIdentifier: "actor", status: "active", accountPrincipalCount: 2,
   policies: [{ policyIdentifier: "policy", name: "Owner", statements: [{ effect: "allow", actions: ["principal_group_manage"], resourceTypes: ["principal_group"], condition: null }] }],
  },
 };
 it("shows settings to a manager without Account administration permissions", () => {
  expect(getAdminNavigation(identity, { status: "missing" }, available).some(item => item.section === "monetization")).toBe(true);
 });
 it.each([
  null,
  { status: "error" },
  { ...available, principal: { ...available.principal, policies: [] } },
  { ...available, principal: { ...available.principal, status: "suspended" } },
  { ...available, principal: { ...available.principal, status: "forced_stop" } },
  { ...available, principal: { ...available.principal, policies: [...available.principal.policies, { policyIdentifier: "deny", name: "Deny", statements: [{ effect: "deny", actions: ["principal_group_manage"], resourceTypes: ["principal_group"], condition: null }] }] } },
 ] satisfies (MonetizationState | null)[])("hides settings while access is unresolved or unavailable: %j", state => {
  expect(getAdminNavigation(identity, { status: "missing" }, state).some(item => item.section === "monetization")).toBe(false);
 });
 it("resolves direct access and selected section without falling through to Wiki", () => {
  for (const path of ["/admin/monetization", "/admin/monetization/principal-groups"]) {
   expect(resolveAdminSection(path)).toBe("monetization");
   expect(resolveAdminClientPage(path)).toBe("monetization");
   expect(resolveAdminDestination(identity, path, { status: "missing" })).toBe(path);
  }
 });
 it("hides the entry for unavailable accounts", () => {
  expect(getAdminNavigation({ ...identity, accountPrincipalStatus: "suspended" }, { status: "missing" }).some(item => item.section === "monetization")).toBe(false);
 });
});
