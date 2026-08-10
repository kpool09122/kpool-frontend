import { describe, expect, it } from "vitest";

import {
  getAccountIdentifierFromIdentity,
  getAccountPrincipalIdentifierFromIdentity,
} from "./accountIdentity";

describe("account identity helpers", () => {
  it("reads direct account identifiers from authenticated identity payloads", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("reads direct account principal identifiers from authenticated identity payloads", () => {
    expect(
      getAccountPrincipalIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
        accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
      }),
    ).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("reads nested account principal identifiers", () => {
    expect(
      getAccountPrincipalIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
        account: {
          accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
        },
      }),
    ).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("returns null when account principal identifiers are unavailable", () => {
    expect(
      getAccountPrincipalIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
      }),
    ).toBeNull();
  });
});
