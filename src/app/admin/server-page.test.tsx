import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(mocks.fetchAuthenticatedIdentity).not.toHaveBeenCalled();
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
