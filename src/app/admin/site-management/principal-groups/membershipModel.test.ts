import { describe, expect, it } from "vitest";
import { updateSiteManagementUserGroups, areSiteManagementMembershipsEqual } from "./membershipModel";

describe("SiteManagement membership editing", () => {
  it("compares membership sets independently of ordering, duplicates and missing empty entries", () => {
    expect(areSiteManagementMembershipsEqual({ a: ["u", "v", "u"], g: [] }, { a: ["v", "u"] })).toBe(true);
    expect(areSiteManagementMembershipsEqual({ a: ["u"] }, {})).toBe(false);
  });
  it("creates initially empty editable entries while preserving unknown groups and other users", () => {
    const groups = [{ principalGroupIdentifier: "g", name: "General" }];
    const saved = { unknown: ["u"], other: ["other"] };
    expect(updateSiteManagementUserGroups(saved, groups, "u", ["g", "g", "unknown"])).toEqual({ ...saved, g: ["u"] });
    expect(updateSiteManagementUserGroups({}, groups, "u", [])).toEqual({ g: [] });
    expect(saved).toEqual({ unknown: ["u"], other: ["other"] });
  });
  it("updates multiple memberships without mutating saved data, and reverts cleanly", () => {
    const groups = [
      { principalGroupIdentifier: "a", name: "Administrators", roles: ["Administrator"] },
      { principalGroupIdentifier: "g", name: "General", roles: ["General"] },
      { principalGroupIdentifier: "o", name: "Operators", roles: ["Operator", "Administrator"] },
    ];
    const saved = { a: ["u", "other"], g: [], o: ["u"] };
    const draft = updateSiteManagementUserGroups(saved, groups, "u", ["a", "g", "unknown"]);
    expect(draft).toEqual({ a: ["u", "other"], g: ["u"], o: ["u"] });
    expect(saved.g).toEqual([]);
    expect(areSiteManagementMembershipsEqual(draft, saved)).toBe(false);
    const cleared = updateSiteManagementUserGroups(draft, groups, "u", []);
    expect(cleared).toEqual({ a: ["other"], g: [], o: ["u"] });
    expect(areSiteManagementMembershipsEqual(updateSiteManagementUserGroups(cleared, groups, "u", ["a"]), saved)).toBe(true);
  });
});
