import { describe, expect, it, vi } from "vitest";

import {
  canReviewWikiDraftImages,
  canReviewWikiDraftWikis,
  createWikiPrincipal,
  getAccountIdentifierFromIdentity,
  getCurrentWikiPrincipal,
  getCurrentWikiPrincipalForRequest,
} from "./wikiPrincipal";

const principal = {
  principalIdentifier: "33333333-3333-3333-3333-333333333333",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  isDelegatedPrincipal: false,
  isEnabled: true,
  policies: [],
};

const policy = ({
  actions,
  effect = "allow",
  name = "IMAGE_REVIEW",
  resourceTypes,
}: {
  actions: string[];
  effect?: string;
  name?: string;
  resourceTypes: string[];
}) => ({
  policyIdentifier: crypto.randomUUID(),
  name,
  isSystemPolicy: true,
  statements: [
    {
      effect,
      actions,
      resourceTypes,
      condition: null,
    },
  ],
});

describe("wiki principal helpers", () => {
  it("normalizes the current principal response when it exists", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(principal),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "available",
      principal,
    });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/wiki/principal/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("normalizes 404 as a missing principal", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ message: "Not found" }),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "missing",
    });
  });

  it("loads the current principal from the private API with request cookies", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(principal),
    });

    await expect(
      getCurrentWikiPrincipalForRequest({
        baseUrl: "https://wiki.example.test/api",
        cookieHeader: "session=abc",
        fetchAdapter,
      }),
    ).resolves.toEqual({
      status: "available",
      principal,
    });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "https://wiki.example.test/api/principal/me",
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: "session=abc",
        },
      },
    );
  });

  it("does not treat server errors as a missing principal", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: "Backend failed" }),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "error",
      message: "Backend failed",
    });
  });

  it("normalizes network failures as errors", async () => {
    const fetchAdapter = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "error",
      message: "network down",
    });
  });

  it("creates a principal with identity and account identifiers", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue(principal),
    });

    await expect(
      createWikiPrincipal({
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
        fetchAdapter,
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
      }),
    ).resolves.toEqual({
      status: "available",
      principal,
    });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/wiki/principal/create", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: expect.any(String),
    });
    expect(JSON.parse(fetchAdapter.mock.calls[0]?.[1]?.body as string)).toEqual({
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("reads accountId from identity payloads", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
        accountId: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("falls back to accountIdentifier for older identity payloads", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("returns null when identity payloads do not include an account id", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
      }),
    ).toBeNull();
  });

  it("allows draft image review when policies allow approve and reject on images", () => {
    expect(
      canReviewWikiDraftImages({
        ...principal,
        policies: [
          policy({
            actions: ["approve", "REJECT"],
            resourceTypes: ["image"],
          }),
        ],
      }),
    ).toBe(true);
  });

  it("treats wildcard actions and resources as full access", () => {
    expect(
      canReviewWikiDraftImages({
        ...principal,
        policies: [
          policy({
            actions: ["*"],
            name: "FULL_ACCESS",
            resourceTypes: ["ALL"],
          }),
        ],
      }),
    ).toBe(true);
  });

  it("does not allow draft image review with only basic editing actions", () => {
    expect(
      canReviewWikiDraftImages({
        ...principal,
        policies: [
          policy({
            actions: ["CREATE", "EDIT", "SUBMIT"],
            name: "BASIC_EDITING",
            resourceTypes: ["WIKI"],
          }),
        ],
      }),
    ).toBe(false);
  });

  it("denies draft image review when a matching deny statement exists", () => {
    expect(
      canReviewWikiDraftImages({
        ...principal,
        policies: [
          policy({
            actions: ["APPROVE", "REJECT"],
            resourceTypes: ["IMAGE"],
          }),
          policy({
            actions: ["reject"],
            effect: "deny",
            name: "DENY_IMAGE_REJECT",
            resourceTypes: ["image"],
          }),
        ],
      }),
    ).toBe(false);
  });

  it("allows draft wiki review when approve and reject are allowed for a wiki resource type", () => {
    expect(
      canReviewWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["APPROVE", "REJECT"],
            name: "GROUP_MANAGEMENT",
            resourceTypes: ["GROUP"],
          }),
        ],
      }),
    ).toBe(true);
  });

  it("does not allow draft wiki review when matching deny covers the only allowed resource type", () => {
    expect(
      canReviewWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["APPROVE", "REJECT"],
            name: "GROUP_MANAGEMENT",
            resourceTypes: ["GROUP"],
          }),
          policy({
            actions: ["APPROVE"],
            effect: "deny",
            name: "DENY_GROUP_APPROVAL",
            resourceTypes: ["GROUP"],
          }),
        ],
      }),
    ).toBe(false);
  });

  it("allows draft wiki review when another resource type remains allowed after a deny", () => {
    expect(
      canReviewWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["APPROVE", "REJECT"],
            name: "MANAGEMENT",
            resourceTypes: ["GROUP", "TALENT"],
          }),
          policy({
            actions: ["REJECT"],
            effect: "deny",
            name: "DENY_GROUP_REJECT",
            resourceTypes: ["GROUP"],
          }),
        ],
      }),
    ).toBe(true);
  });
});
