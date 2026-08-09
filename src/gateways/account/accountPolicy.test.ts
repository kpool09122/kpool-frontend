import { describe, expect, it } from "vitest";

import {
  canInviteAccountMembers,
  canManagePrincipalGroups,
  canUpdateAccount,
  getAccountTypeFromIdentity,
  isCorporationAccount,
} from "./accountPolicy";

const baseIdentity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
};

describe("accountPolicy", () => {
  it("reads account type from direct and nested identity payloads", () => {
    expect(getAccountTypeFromIdentity({ ...baseIdentity, accountType: "corporation" })).toBe("corporation");
    expect(getAccountTypeFromIdentity({ ...baseIdentity, account: { type: "corporation" } })).toBe("corporation");
    expect(getAccountTypeFromIdentity({ ...baseIdentity, accounts: [{ accountType: "individual" }] })).toBe("individual");
    expect(isCorporationAccount({ ...baseIdentity, accountType: "corporation" })).toBe(true);
    expect(isCorporationAccount({ ...baseIdentity, accountType: "individual" })).toBe(false);
  });

  it("allows account member invitations only when allow exists without deny", () => {
    const allowPolicy = {
      ...baseIdentity,
      accountEffectivePolicies: [
        {
          statements: [
            { effect: "allow", actions: ["account:member:invite"], resourceTypes: ["ACCOUNT"] },
          ],
        },
      ],
    };

    expect(canInviteAccountMembers(allowPolicy)).toBe(true);
    expect(canInviteAccountMembers({
      ...allowPolicy,
      accountEffectivePolicies: [
        {
          statements: [
            { effect: "allow", actions: ["account:member:invite"], resourceTypes: ["ACCOUNT"] },
            { effect: "deny", actions: ["account:member:invite"], resourceTypes: ["ACCOUNT"] },
          ],
        },
      ],
    })).toBe(false);
  });

  it("applies account policy conditions to account member invitations", () => {
    const conditionalPolicy = {
      ...baseIdentity,
      accountEffectivePolicies: [
        {
          statements: [
            {
              effect: "allow",
              actions: ["account:member:invite"],
              resourceTypes: ["ACCOUNT"],
              condition: {
                clauses: [
                  {
                    field: "resource:accountType",
                    operator: "eq",
                    value: "corporation",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    expect(canInviteAccountMembers({ ...conditionalPolicy, accountType: "corporation" })).toBe(true);
    expect(canInviteAccountMembers({ ...conditionalPolicy, accountType: "individual" })).toBe(false);
  });

  it("allows principal group management only when allow exists without deny", () => {
    const allowPolicy = {
      ...baseIdentity,
      accountEffectivePolicies: [
        {
          statements: [
            { effect: "allow", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"] },
          ],
        },
      ],
    };

    expect(canManagePrincipalGroups(allowPolicy)).toBe(true);
    expect(canManagePrincipalGroups({
      ...allowPolicy,
      accountEffectivePolicies: [
        {
          statements: [
            { effect: "allow", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"] },
            { effect: "deny", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"] },
          ],
        },
      ],
    })).toBe(false);
    expect(canManagePrincipalGroups({
      ...baseIdentity,
      accountEffectivePolicies: [
        {
          statements: [
            { effect: "allow", actions: ["account:update"], resourceTypes: ["ACCOUNT"] },
          ],
        },
      ],
    })).toBe(false);
  });

  it("applies account policy conditions to every account action check", () => {
    const conditionalPolicy = {
      ...baseIdentity,
      accountEffectivePolicies: [
        {
          statements: [
            {
              effect: "allow",
              actions: [
                "account:update",
                "account:member:invite",
                "account:principal-group:manage",
              ],
              resourceTypes: ["ACCOUNT"],
              condition: {
                clauses: [
                  {
                    field: "resource:accountType",
                    operator: "eq",
                    value: "corporation",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    expect(canInviteAccountMembers({ ...conditionalPolicy, accountType: "corporation" })).toBe(true);
    expect(canUpdateAccount({ ...conditionalPolicy, accountType: "corporation" })).toBe(true);
    expect(canManagePrincipalGroups({ ...conditionalPolicy, accountType: "corporation" })).toBe(true);
    expect(canInviteAccountMembers({ ...conditionalPolicy, accountType: "individual" })).toBe(false);
    expect(canUpdateAccount({ ...conditionalPolicy, accountType: "individual" })).toBe(false);
    expect(canManagePrincipalGroups({ ...conditionalPolicy, accountType: "individual" })).toBe(false);
  });
});
