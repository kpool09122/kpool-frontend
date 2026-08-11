import { describe, expect, it } from "vitest";

import {
  getAccountApiBaseUrl,
  parseAccountMembersResponse,
  parseAccountSummary,
  parseCreateAccountResult,
  parseListAccountDocumentsResponse,
  parsePrincipalGroupsResponse,
  parseUploadAccountDocumentsRequest,
  parseUploadAccountDocumentsResponse,
  parseUpdateAccountRequest,
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

  it("parses account summaries and update requests with phone and address", () => {
    const address = {
      countryCode: "JP",
      administrativeAreaCode: "13",
      postalCode: "100-0001",
      locality: "千代田区",
      addressLine1: "丸の内1-1-1",
      addressLine2: null,
    };

    expect(parseAccountSummary({
      accountIdentifier: "44444444-4444-4444-8444-444444444444",
      email: "member@example.com",
      type: "corporation",
      name: "Member Account",
      status: "active",
      accountCategory: "standard",
      phone: "03-1234-5678",
      address,
    })).toMatchObject({
      phone: "03-1234-5678",
      address,
    });
    expect(parseUpdateAccountRequest({
      accountName: "Member Account",
      phone: null,
      address,
    })).toEqual({
      accountName: "Member Account",
      phone: null,
      address,
    });
  });

  it("parses account members and principal groups with generated schemas", () => {
    expect(parseAccountMembersResponse({ members: [member] })).toEqual({ members: [member] });
    expect(parsePrincipalGroupsResponse({ principalGroups: [principalGroup] })).toEqual({
      principalGroups: [principalGroup],
    });
  });

  it("parses account document upload and list payloads", () => {
    const document = {
      documentType: "passport",
      documentPath: "accounts/documents/passport.pdf",
      uploadedAt: "2026-08-02T00:00:00Z",
    };

    expect(parseUploadAccountDocumentsRequest({
      documents: [{ documentType: "passport", fileContents: "YWJj" }],
    })).toEqual({ documents: [{ documentType: "passport", fileContents: "YWJj" }] });
    expect(parseUploadAccountDocumentsResponse({ documents: [document] })).toEqual({ documents: [document] });
    expect(parseListAccountDocumentsResponse({ documents: [document] })).toEqual({ documents: [document] });
  });

  it("rejects invalid account document upload payloads", () => {
    expect(() => parseUploadAccountDocumentsRequest({
      documents: [{ documentType: "passport" }],
    })).toThrow();
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
