import { describe, expect, it } from "vitest";

import {
  getAccountApiBaseUrl,
  parseAccountMembersResponse,
  parseCreateAccountResult,
  parsePrincipalGroupsResponse,
  parseUpdatePrincipalGroupMembersRequest,
  withAccountApiPrefix,
} from "./accountApi";

const member = {
  principalIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: "22222222-2222-4222-8222-222222222222",
  identityName: "member",
  email: "member@example.com",
  principalGroups: [
    {
      principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
      name: "Managers",
      isDefault: false,
    },
  ],
};

const principalGroup = {
  principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
  accountIdentifier: "44444444-4444-4444-8444-444444444444",
  name: "Managers",
  roleIdentifiers: ["55555555-5555-4555-8555-555555555555"],
  isDefault: false,
  members: [
    {
      principalIdentifier: member.principalIdentifier,
      identityIdentifier: member.identityIdentifier,
      identityName: member.identityName,
      email: member.email,
    },
  ],
};

describe("account API helpers", () => {
  it("adds the backend account prefix when the base URL omits it", () => {
    expect(withAccountApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/account",
    );
    expect(withAccountApiPrefix("http://127.0.0.1:8080/api/account")).toBe(
      "http://127.0.0.1:8080/api/account",
    );
  });

  it("uses the server-only env var for the Account API base URL", () => {
    expect(getAccountApiBaseUrl({ KPOOL_ACCOUNT_API_BASE_URL: "http://api.test" })).toBe(
      "http://api.test/api/account",
    );
  });

  it("accepts the backend empty array response for an already handled account", () => {
    expect(parseCreateAccountResult([])).toEqual({});
  });

  it("parses account members and principal groups with generated schemas", () => {
    expect(parseAccountMembersResponse({ members: [member] })).toEqual({ members: [member] });
    expect(parsePrincipalGroupsResponse({ principalGroups: [principalGroup] })).toEqual({
      principalGroups: [principalGroup],
    });
  });

  it("rejects invalid principal group member update payloads", () => {
    expect(() => parseUpdatePrincipalGroupMembersRequest({
      principalGroups: [
        {
          principalGroupIdentifier: principalGroup.principalGroupIdentifier,
        },
      ],
    })).toThrow();
  });
});
