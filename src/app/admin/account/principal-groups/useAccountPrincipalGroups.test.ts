import { describe, expect, it } from "vitest";

import {
  areMembershipsEqual,
  createUpdatePayload,
  updateMembershipForUser,
} from "./useAccountPrincipalGroups";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const groupA = "33333333-3333-4333-8333-333333333333";
const groupB = "44444444-4444-4444-8444-444444444444";

describe("account principal group membership helpers", () => {
  it("replaces one user's memberships without removing other users", () => {
    expect(updateMembershipForUser({
      [groupA]: [userA, userB],
      [groupB]: [],
    }, userA, [groupA, groupB])).toEqual({
      [groupA]: [userA, userB],
      [groupB]: [userA],
    });
  });

  it("compares memberships without depending on group or member order", () => {
    expect(areMembershipsEqual({
      [groupA]: [userA, userB],
      [groupB]: [userB],
    }, {
      [groupB]: [userB],
      [groupA]: [userB, userA],
    })).toBe(true);
  });

  it("creates the group-oriented API payload for a multiply assigned user", () => {
    expect(createUpdatePayload({
      [groupA]: [userA, userB],
      [groupB]: [userA],
    })).toEqual({
      principalGroups: [
        { principalGroupIdentifier: groupA, principalIdentifiers: [userA, userB] },
        { principalGroupIdentifier: groupB, principalIdentifiers: [userA] },
      ],
    });
  });
});
