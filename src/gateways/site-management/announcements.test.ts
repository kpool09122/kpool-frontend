import { describe, expect, it } from "vitest";
import {
  canAccessSiteManagement,
  canUseAnnouncements,
} from "./siteManagementPolicy";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
const identity = (action: string, effect = "allow") =>
  ({
    accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active",
    account: { status: "active" },
    accountIdentifier: "account",
    siteManagementPrincipalIdentifier: "actor",
    siteManagementPolicies: [
      {
        statements: [
          {
            actions: [action],
            resourceTypes: ["announcement"],
            condition: null,
            effect,
          },
        ],
      },
    ],
  }) as unknown as AuthenticatedIdentitySummary;
describe("announcement permissions", () => {
  it("includes draft viewers in section access", () => {
    expect(canAccessSiteManagement(identity("announcement:view-draft"))).toBe(
      true,
    );
  });
  it("checks exact action, not role name", () => {
    expect(
      canUseAnnouncements(identity("announcement:view-draft"), "view-draft"),
    ).toBe(true);
    expect(
      canUseAnnouncements(identity("announcement:view-draft"), "publish"),
    ).toBe(false);
    expect(
      canUseAnnouncements(identity("announcement:publish", "deny"), "publish"),
    ).toBe(false);
  });
});
