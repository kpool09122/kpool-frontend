import { describe, expect, it } from "vitest";
import { canManageSiteManagementPrincipalGroups } from "./siteManagementPolicy";

const identity = { language: "ja", identityIdentifier: "actor", identityName: "admin", email: "a@example.test", accountIdentifier: "account", account: { status: "active" }, siteManagementPrincipalIdentifier: "principal" };
const statement: { effect: string; actions: string[]; resourceTypes: string[]; condition: string | null } = { effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null };
const policy = (statements = [statement]) => ({ policyIdentifier: "policy", name: "Administrator", statements });
describe("SiteManagement authorization", () => {
  it("allows only an exact applicable allow for an active account", () => {
    expect(canManageSiteManagementPrincipalGroups({ ...identity, siteManagementPolicies: [policy()] })).toBe(true);
    expect(canManageSiteManagementPrincipalGroups(identity)).toBe(false);
    expect(canManageSiteManagementPrincipalGroups({ ...identity, siteManagementPolicies: [policy()], account: { status: "suspended" } })).toBe(false);
  });
  it("prioritizes applicable deny and does not reuse Account conditions or wildcards", () => {
    expect(canManageSiteManagementPrincipalGroups({ ...identity, siteManagementPolicies: [policy([statement, { ...statement, effect: "deny" }])] })).toBe(false);
    for (const condition of ["own_contact", "unknown"]) expect(canManageSiteManagementPrincipalGroups({ ...identity, siteManagementPolicies: [policy([{ ...statement, condition }])] })).toBe(false);
    expect(canManageSiteManagementPrincipalGroups({ ...identity, siteManagementPolicies: [policy([{ ...statement, actions: ["*"] }])] })).toBe(false);
  });
  it.each(["General", "Operator"])("does not authorize %s by name or Principal ID", (name) => {
    expect(canManageSiteManagementPrincipalGroups({ ...identity, siteManagementPolicies: [{ ...policy([]), name }] })).toBe(false);
  });
});
