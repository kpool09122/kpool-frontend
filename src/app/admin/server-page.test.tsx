import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  fetchAuthenticatedIdentity: vi.fn(),
  getInitialWikiPrincipalForRequest: vi.fn(),
  loadInitialDraftWikiListForRequest: vi.fn(),
  loadInitialWikiDraftImagesForRequest: vi.fn(),
  loadInitialWikiImageDeletionRequestsForRequest: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/gateways/identity/authIdentity", () => ({
  fetchAuthenticatedIdentity: mocks.fetchAuthenticatedIdentity,
}));

vi.mock("@/gateways/wiki/draftWiki", () => ({
  createInitialDraftWikis: () => ({}),
  loadInitialDraftWikiListForRequest: mocks.loadInitialDraftWikiListForRequest,
}));

vi.mock("@/gateways/wiki/wikiImageBrowserApi", () => ({
  loadInitialWikiDraftImagesForRequest: mocks.loadInitialWikiDraftImagesForRequest,
  loadInitialWikiImageDeletionRequestsForRequest: mocks.loadInitialWikiImageDeletionRequestsForRequest,
}));

vi.mock("@/gateways/wiki/wikiPrincipal", () => ({
  getInitialWikiPrincipalForRequest: mocks.getInitialWikiPrincipalForRequest,
}));

vi.mock("./[[...slug]]/AdminAppClient", () => ({
  AdminAppClient: ({ returnTo }: { returnTo: string | null }) => (
    <div data-testid="admin-client">{returnTo ?? "no-return"}</div>
  ),
}));

import Admin from "./[[...slug]]/page";

describe("Admin server route", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      toString: () => "session=abc",
    });
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      identityName: "member",
      email: "member@example.com",
      language: "ja",
      account: { status: "active", type: "individual" },
      accountIdentifier: "account", accountPrincipalStatus: "active",
      accountPolicies: [{ statements: [], policyIdentifier: "policy", name: "admin" }],
    });
    mocks.getInitialWikiPrincipalForRequest.mockResolvedValue({ status: "missing" });
    mocks.loadInitialDraftWikiListForRequest.mockResolvedValue({
      isInitialLoading: false,
      isLoadingMore: false,
      loadError: null,
      pageInfo: null,
      wikis: [],
    });
    mocks.loadInitialWikiDraftImagesForRequest.mockResolvedValue(null);
    mocks.loadInitialWikiImageDeletionRequestsForRequest.mockResolvedValue(null);
  });

  it("redirects /admin without returnTo to the default Wiki editing route", async () => {
    await expect(Admin()).rejects.toThrow("redirect:/admin/wiki/editing");
    expect(mocks.fetchAuthenticatedIdentity).toHaveBeenCalledTimes(1);
    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated returnTo activation requests to login with the admin return destination", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue(null);

    await expect(Admin({ searchParams: Promise.resolve({ returnTo: "/wiki/ja/gr-aurora-echo/edit" }) })).rejects.toThrow(
      "redirect:/login?returnTo=%2Fadmin",
    );
    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
  });

  it("passes safe returnTo query values to the client", async () => {
    render(
      await Admin({
        searchParams: Promise.resolve({
          returnTo: "/wiki/ja/gr-aurora-echo/edit",
        }),
      }),
    );

    expect(screen.getByTestId("admin-client")).toHaveTextContent(
      "/wiki/ja/gr-aurora-echo/edit",
    );
  });

  it("does not load any service data for a pending account", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      identityName: "member",
      email: "member@example.com",
      language: "ja",
      account: { status: "pending", type: null },
    });

    render(
      await Admin({
        params: Promise.resolve({ slug: ["wiki", "submitted"] }),
        searchParams: Promise.resolve({ authReturnTo: "/wiki/ja/example" }),
      }),
    );

    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
    expect(mocks.loadInitialDraftWikiListForRequest).not.toHaveBeenCalled();
    expect(mocks.loadInitialWikiDraftImagesForRequest).not.toHaveBeenCalled();
    expect(mocks.loadInitialWikiImageDeletionRequestsForRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-client")).toHaveTextContent("/wiki/ja/example");
  });

  it("continues an active SSO account to its safe auth return destination", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      identityName: "member",
      email: "member@example.com",
      language: "ja",
      account: { status: "active", type: "individual" },
    });

    await expect(Admin({
      searchParams: Promise.resolve({ authReturnTo: "/wiki/ja/example" }),
    })).rejects.toThrow("redirect:/wiki/ja/example");
  });

  it.each(["/\\example.org", "//example.org", "/\texample.org", "https://example.org", "/login"])(
    "normalizes unsafe authReturnTo %j before redirecting",
    async (authReturnTo) => {
      await expect(Admin({ searchParams: Promise.resolve({ authReturnTo }) }))
        .rejects.toThrow("redirect:/admin");
    },
  );

  it.each([null, undefined, { status: "unknown" }])(
    "does not load service data for an unavailable account %j",
    async (account) => {
      mocks.fetchAuthenticatedIdentity.mockResolvedValue({ identityIdentifier: "identity-1", account });
      await Admin({ params: Promise.resolve({ slug: ["wiki", "submitted"] }) });
      expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
      expect(mocks.loadInitialDraftWikiListForRequest).not.toHaveBeenCalled();
      expect(mocks.loadInitialWikiDraftImagesForRequest).not.toHaveBeenCalled();
      expect(mocks.loadInitialWikiImageDeletionRequestsForRequest).not.toHaveBeenCalled();
    },
  );

  it("does not load Wiki principal or draft lists for account pages", async () => {
    render(
      await Admin({
        params: Promise.resolve({ slug: ["account", "profile"] }),
      }),
    );

    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
    expect(mocks.loadInitialDraftWikiListForRequest).not.toHaveBeenCalled();
  });

  it("loads only the requested Wiki draft list for Wiki pages", async () => {
    mocks.getInitialWikiPrincipalForRequest.mockResolvedValue({
      status: "available",
      principal: {},
    });

    render(
      await Admin({
        params: Promise.resolve({ slug: ["wiki", "submitted"] }),
      }),
    );

    expect(mocks.loadInitialDraftWikiListForRequest).toHaveBeenCalledWith(
      "session=abc",
      "submittedWikis",
    );
    expect(mocks.loadInitialWikiDraftImagesForRequest).not.toHaveBeenCalled();
    expect(mocks.loadInitialWikiImageDeletionRequestsForRequest).not.toHaveBeenCalled();
  });
});


describe("suspended account entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ toString: () => "session=abc" });
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "identity-1", account: { status: "suspended" },
    });
  });

  it.each([{}, { returnTo: "/admin/wiki/editing" }, { authReturnTo: "/wiki/ja/example" }])(
    "redirects the admin entry to user settings for %j", async (searchParams) => {
      await expect(Admin({ searchParams: Promise.resolve(searchParams) }))
        .rejects.toThrow("redirect:/admin/user/profile");
      expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
      expect(mocks.loadInitialDraftWikiListForRequest).not.toHaveBeenCalled();
    },
  );

  it.each(["profile", "language", "security", "other"])("allows a direct user %s settings request", async (page) => {
    await expect(Admin({ params: Promise.resolve({ slug: ["user", page] }) })).resolves.toBeDefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
  });
});


const stoppedAccountContexts = [
  { account: { status: "suspended" }, accountPrincipalStatus: "active" },
  { account: { status: "active" }, accountPrincipalStatus: "suspended" },
  { account: { status: "active" }, accountPrincipalStatus: "forced_stop" },
];

describe.each(stoppedAccountContexts)("stopped account access %j", (context) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ toString: () => "session=abc" });
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({ identityIdentifier: "identity-1", ...context });
  });

  it.each([undefined, ["wiki", "editing"], ["account", "profile"], ["site-management", "contacts"]])(
    "redirects entry and protected route %j to user settings before loading service data", async (slug) => {
      await expect(Admin({ params: Promise.resolve({ slug }) }))
        .rejects.toThrow("redirect:/admin/user/profile");
      expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
      expect(mocks.loadInitialDraftWikiListForRequest).not.toHaveBeenCalled();
    },
  );

  it("prioritizes user settings over an authentication return destination", async () => {
    await expect(Admin({ searchParams: Promise.resolve({ authReturnTo: "/admin/wiki/editing" }) }))
      .rejects.toThrow("redirect:/admin/user/profile");
  });

  it("allows user settings without redirecting back to the authentication return destination", async () => {
    await expect(Admin({
      params: Promise.resolve({ slug: ["user", "profile"] }),
    })).resolves.toBeDefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});


describe("first visible admin section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ toString: () => "session=abc" });
  });

  it.each([
    [{ siteManagementPrincipalStatus: "active", siteManagementPrincipalIdentifier: "site-user", siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Site", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }] }, "/admin/site-management/contacts"],
    [{ accountPolicies: [{ policyIdentifier: "account-policy", name: "Account", isSystemPolicy: true, statements: [] }] }, "/admin/account/profile"],
    [{}, "/admin/user/profile"],
  ])("skips hidden Wiki for entry and saved Wiki routes: %j", async (permissions, destination) => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "identity-1", account: { status: "active" }, accountIdentifier: "account",
      accountPrincipalStatus: "active", wikiPrincipalStatus: "suspended", ...permissions,
    });
    for (const slug of [undefined, ["wiki", "editing"]]) {
      await expect(Admin({ params: Promise.resolve({ slug }) })).rejects.toThrow(`redirect:${destination}`);
    }
    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
    expect(mocks.loadInitialDraftWikiListForRequest).not.toHaveBeenCalled();
  });
});
