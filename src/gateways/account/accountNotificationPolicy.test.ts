import { describe, expect, it } from "vitest";
import {
  canReadAccountNotificationSettings as read,
  canUpdateAccountNotificationSettings as update,
} from "./accountPolicy";
const identity = { accountPrincipalStatus: "active" as const, siteManagementPrincipalStatus: "active" as const,
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountType: "individual",
};
const withStatements = (statements: unknown[]) => ({
  ...identity,
  accountPolicies: [{ statements }],
});
const allow = (actions: string[]) => ({
  effect: "allow",
  actions,
  resourceTypes: ["ACCOUNT"],
});
describe("notification policy", () => {
  it("does not grant notification access from general permissions or group names", () => {
    const user = {
      ...withStatements([allow(["account:read", "account:update"])]),
      principalGroups: [{ name: "Owners" }],
    };
    expect(read(user)).toBe(false);
    expect(update(user)).toBe(false);
  });
  it("accepts custom role statements and keeps read/update independent", () => {
    expect(
      read(withStatements([allow(["account:notification-settings:read"])])),
    ).toBe(true);
    expect(
      update(withStatements([allow(["account:notification-settings:read"])])),
    ).toBe(false);
    expect(
      read(withStatements([allow(["account:notification-settings:update"])])),
    ).toBe(false);
    expect(
      update(withStatements([allow(["account:notification-settings:update"])])),
    ).toBe(true);
  });
  it.each(["read", "update"])(
    "evaluates conditions and Deny for %s",
    (action) => {
      const actions = [`account:notification-settings:${action}`];
      const check = action === "read" ? read : update;
      expect(
        check(withStatements([allow(actions), { effect: "deny", actions }])),
      ).toBe(false);
      expect(
        check(
          withStatements([
            {
              ...allow(actions),
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
          ]),
        ),
      ).toBe(false);
      expect(
        check(
          withStatements([
            {
              ...allow(actions),
              condition: {
                clauses: [
                  {
                    field: "resource:accountType",
                    operator: "eq",
                    value: "individual",
                  },
                ],
              },
            },
          ]),
        ),
      ).toBe(true);
    },
  );
});
