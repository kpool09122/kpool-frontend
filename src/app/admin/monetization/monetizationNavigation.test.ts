import { describe, expect, it } from "vitest";
import { getAdminNavigation, resolveAdminDestination, resolveAdminSection } from "../adminNavigation";
import { resolveAdminClientPage } from "../[[...slug]]/AdminAppClient";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
const identity: AuthenticatedIdentitySummary = { identityIdentifier: "actor", identityName: "Actor", email: "actor@example.test", language: "ja", accountIdentifier: "account", account: { status: "active" }, accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", accountPolicies: [], siteManagementPolicies: [] };
describe("Monetization navigation", () => {
 it("is visible without Account or Monetization administration permissions and follows account settings", () => {
  const navigation = getAdminNavigation(identity, { status: "missing" });
  expect(navigation.map(item => item.section)).toEqual(["wiki", "analyze", "monetization", "settings"]);
  expect(getAdminNavigation({ ...identity, accountPolicies: [{ policyIdentifier: "p", name: "Admin", isSystemPolicy: true, statements: [] }] }, { status: "missing" }).map(item => item.section)).toEqual(["wiki", "analyze", "accountSettings", "monetization", "settings"]);
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
