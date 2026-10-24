import { describe, expect, it } from "vitest";
import { canAccessSiteManagement, canManageSiteManagementPrincipalGroups, canReplyToSiteManagementContacts, canViewSiteManagementContacts } from "./siteManagementPolicy";

const identity = { accountPrincipalStatus: "active" as const, siteManagementPrincipalStatus: "active" as const, language: "ja", identityIdentifier: "actor", identityName: "admin", email: "a@example.test", accountIdentifier: "account", account: { status: "active" }, siteManagementPrincipalIdentifier: "principal" };
const statement: { effect: string; actions: string[]; resourceTypes: string[]; condition: string | null } = { effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null };
const policy = (statements = [statement]) => ({ policyIdentifier: "policy", name: "Administrator", statements });
describe("SiteManagement authorization", () => {
  it.each([
    ["contact:view", canViewSiteManagementContacts],
    ["contact:reply", canReplyToSiteManagementContacts],
  ] as const)("requires an active authenticated principal and an applicable %s permission", (action, allowed) => {
    const contact = { ...statement, actions: [action], resourceTypes: ["contact"] };
    const actor = { ...identity, siteManagementPolicies: [policy([contact])] };
    expect(allowed(actor)).toBe(true);
    expect(allowed(null)).toBe(false);
    expect(allowed({ ...actor, accountIdentifier: null })).toBe(false);
    expect(allowed({ ...actor, siteManagementPrincipalIdentifier: null })).toBe(false);
    expect(allowed({ ...actor, account: { status: "suspended" } })).toBe(false);
    for (const status of ["suspended", "forced_stop"] as const) {
      expect(allowed({ ...actor, accountPrincipalStatus: status })).toBe(false);
      expect(allowed({ ...actor, siteManagementPrincipalStatus: status })).toBe(false);
    }
    expect(allowed({ ...actor, siteManagementPolicies: [policy([contact, { ...contact, effect: "deny" }])] })).toBe(false);
    expect(allowed({ ...actor, siteManagementPolicies: [policy([{ ...contact, condition: "own_contact" }])] })).toBe(false);
    expect(allowed({ ...actor, siteManagementPolicies: [policy([{ ...contact, actions: ["*"] }])] })).toBe(false);
  });
  it("separates section permission from principal count and tab availability", () => {
    expect(canAccessSiteManagement({ ...identity, siteManagementPrincipalCount: 1, siteManagementPolicies: [policy()] })).toBe(true);
    expect(canAccessSiteManagement(identity)).toBe(false);
    const contact = { ...statement, actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" };
    expect(canAccessSiteManagement({ ...identity, siteManagementPolicies: [policy([contact])] })).toBe(true);
    expect(canAccessSiteManagement({ ...identity, siteManagementPolicies: [policy([contact, { ...contact, effect: "deny" }])] })).toBe(false);
    expect(canAccessSiteManagement({ ...identity, siteManagementPolicies: [policy([statement, { ...statement, effect: "deny" }])] })).toBe(false);
    expect(canAccessSiteManagement({ ...identity, siteManagementPolicies: [policy([{ ...statement, actions: ["announcement:create"], resourceTypes: ["announcement"] }])] })).toBe(true);
    expect(canAccessSiteManagement({ ...identity, siteManagementPolicies: [policy([{ ...statement, actions: ["*"] }])] })).toBe(false);
  });
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
