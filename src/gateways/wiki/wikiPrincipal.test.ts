import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canAutoCreateWikiDraftWikis,
  canPublishWikiDraftWikis,
  canReviewWikiDraftImages,
  canReviewWikiDraftWikis,
  createWikiPrincipal,
  getAccountIdentifierFromIdentity,
  getCurrentWikiPrincipal,
  getCurrentWikiPrincipalForRequest,
  getInitialWikiPrincipalForRequest,
  wikiPrincipalUnavailableMessage,
} from "./wikiPrincipal";
import {
  createMockEditingDraftWiki,
  mockWikiPrincipalCookieName,
} from "./mockWikiGateway";

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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("resolves E2E mock principal state from the shared mock gateway cookie contract", async () => {
    vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "1");
    const fetchAdapter = vi.fn();

    await expect(
      getCurrentWikiPrincipalForRequest({
        cookieHeader: `${mockWikiPrincipalCookieName}=wiki-review`,
        fetchAdapter,
      }),
    ).resolves.toMatchObject({
      status: "available",
      principal: {
        policies: [
          expect.objectContaining({
            name: "GROUP_MANAGEMENT",
          }),
        ],
      },
    });
    expect(fetchAdapter).not.toHaveBeenCalled();
  });

  it("keeps E2E draft wiki fixture in the mock gateway module", () => {
    expect(createMockEditingDraftWiki()).toMatchObject({
      name: "編集中 Wiki",
      slug: "gr-review-wiki",
      status: "pending",
    });
  });

  it("does not expose upstream server error details from the browser route response", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({
        message: "database failed at internal.wiki.example.test",
      }),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "error",
      message: wikiPrincipalUnavailableMessage,
    });
  });

  it("does not expose fetch error details from the browser principal route", async () => {
    const fetchAdapter = vi.fn().mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND internal.wiki.example.test"),
    );

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "error",
      message: wikiPrincipalUnavailableMessage,
    });
  });

  it("does not expose upstream server error details from the private API request", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({
        detail: "stack trace from internal.wiki.example.test",
      }),
    });

    await expect(
      getCurrentWikiPrincipalForRequest({
        baseUrl: "https://wiki.example.test/api",
        cookieHeader: "session=abc",
        fetchAdapter,
      }),
    ).resolves.toEqual({
      status: "error",
      message: wikiPrincipalUnavailableMessage,
    });
  });

  it("does not expose fetch error details from the private API request", async () => {
    const fetchAdapter = vi.fn().mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND internal.wiki.example.test"),
    );

    await expect(
      getCurrentWikiPrincipalForRequest({
        baseUrl: "https://wiki.example.test/api",
        cookieHeader: "session=abc",
        fetchAdapter,
      }),
    ).resolves.toEqual({
      status: "error",
      message: wikiPrincipalUnavailableMessage,
    });
  });

  it("keeps unauthenticated mypage SSR principal lookup idle outside mock mode", async () => {
    const principalState = await getInitialWikiPrincipalForRequest({
      cookieHeader: "",
      hasAuthenticatedIdentity: false,
    });

    expect(principalState).toEqual({ status: "idle" });
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

  it.each([
    [401, "ログインが必要です。"],
    [403, "このアカウントでは Wiki principal を作成できません。"],
  ])("returns a user-facing error when principal creation receives %s", async (status, detail) => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: vi.fn().mockResolvedValue({ detail }),
    });

    await expect(
      createWikiPrincipal({
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
        fetchAdapter,
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
      }),
    ).resolves.toEqual({
      status: "error",
      message: detail,
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

  it("reads account identifiers from nested account payloads", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
        account: {
          accountIdentifier: "22222222-2222-2222-2222-222222222222",
        },
      }),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("reads account identifiers from account arrays", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
        accounts: [
          {
            id: "22222222-2222-2222-2222-222222222222",
          },
        ],
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

  it("allows draft wiki publishing when publish is allowed for a wiki resource type", () => {
    expect(
      canPublishWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["PUBLISH"],
            name: "TALENT_MANAGEMENT",
            resourceTypes: ["TALENT"],
          }),
        ],
      }),
    ).toBe(true);
  });

  it("does not allow draft wiki publishing when a matching deny exists", () => {
    expect(
      canPublishWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["PUBLISH"],
            name: "AGENCY_MANAGEMENT",
            resourceTypes: ["AGENCY"],
          }),
          policy({
            actions: ["PUBLISH"],
            effect: "deny",
            name: "DENY_AGENCY_APPROVAL",
            resourceTypes: ["AGENCY"],
          }),
        ],
      }),
    ).toBe(false);
  });

  it("allows draft wiki auto-create with automatic create actions and wildcards", () => {
    expect(
      canAutoCreateWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["automatic_create"],
            name: "AGENCY_MANAGEMENT",
            resourceTypes: ["agency"],
          }),
        ],
      }),
    ).toBe(true);
    expect(
      canAutoCreateWikiDraftWikis({
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

  it("does not allow draft wiki auto-create for basic editing or matching denies", () => {
    expect(
      canAutoCreateWikiDraftWikis({
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
    expect(
      canAutoCreateWikiDraftWikis({
        ...principal,
        policies: [
          policy({
            actions: ["AUTOMATIC_CREATE"],
            name: "GROUP_MANAGEMENT",
            resourceTypes: ["GROUP"],
          }),
          policy({
            actions: ["AUTOMATIC_CREATE"],
            effect: "deny",
            name: "DENY_GROUP_AUTO_CREATE",
            resourceTypes: ["GROUP"],
          }),
        ],
      }),
    ).toBe(false);
  });
});
