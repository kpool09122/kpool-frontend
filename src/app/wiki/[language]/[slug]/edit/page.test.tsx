import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  fetchAuthenticatedIdentity: vi.fn(),
  getCurrentWikiPrincipalForRequest: vi.fn(),
  loadDraftWikiState: vi.fn(),
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
  loadDraftWikiState: mocks.loadDraftWikiState,
}));

vi.mock("@/gateways/wiki/wikiPrincipal", () => ({
  getCurrentWikiPrincipalForRequest: mocks.getCurrentWikiPrincipalForRequest,
}));

vi.mock("../../../[slug]/edit/WikiEditPage", () => ({
  WikiEditPage: ({ wikiState }: { wikiState: { status: string } }) => (
    <div data-testid="wiki-edit-page">{wikiState.status}</div>
  ),
}));

import Page, { dynamic, revalidate } from "./page";

const routeProps = (searchParams: Record<string, string> = {}) => ({
  params: Promise.resolve({
    language: "ja",
    slug: "gr-aurora-echo",
  }),
  searchParams: Promise.resolve(searchParams),
});

describe("Wiki edit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      toString: () => "session=abc",
    });
    mocks.loadDraftWikiState.mockResolvedValue({
      status: "success",
      data: { wikiIdentifier: "draft-1", resourceType: "group" },
    });
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "identity-1",
      account: { status: "active" },
    });
    mocks.getCurrentWikiPrincipalForRequest.mockResolvedValue({
      status: "available",
      principal: {},
    });
  });

  afterEach(() => {
    cleanup();
  });

  it.each([null, undefined, { status: "unknown" }, { status: "suspended" }])(
    "blocks editing when the account is unavailable: %j",
    async (account) => {
      mocks.fetchAuthenticatedIdentity.mockResolvedValue({ identityIdentifier: "identity-1", account });
      await expect(Page(routeProps())).rejects.toThrow("redirect:/admin?authReturnTo=");
      expect(mocks.getCurrentWikiPrincipalForRequest).not.toHaveBeenCalled();
      expect(mocks.loadDraftWikiState).not.toHaveBeenCalled();
    },
  );

  it("disables route caching for realtime draft edits", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("loads the draft with forwarded cookies when authenticated principal is available", async () => {
    await expect(Page(routeProps())).rejects.toThrow("redirect:/wiki/draft-1/edit?resourceType=group");

    expect(mocks.fetchAuthenticatedIdentity).toHaveBeenCalledWith({
      cookieHeader: "session=abc",
    });
    expect(mocks.getCurrentWikiPrincipalForRequest).toHaveBeenCalledWith({
      cookieHeader: "session=abc",
    });
    expect(mocks.loadDraftWikiState).toHaveBeenCalledWith("ja", "gr-aurora-echo", {
      Cookie: "session=abc",
    });
  });

  it("loads the draft without forwarded cookies when no request cookies exist", async () => {
    mocks.cookies.mockResolvedValue({
      toString: () => "",
    });

    await expect(Page(routeProps())).rejects.toThrow("redirect:/wiki/draft-1/edit?resourceType=group");

    expect(mocks.fetchAuthenticatedIdentity).toHaveBeenCalledWith({
      cookieHeader: "",
    });
    expect(mocks.getCurrentWikiPrincipalForRequest).toHaveBeenCalledWith({
      cookieHeader: "",
    });
    expect(mocks.loadDraftWikiState).toHaveBeenCalledWith("ja", "gr-aurora-echo");
  });

  it("redirects unauthenticated edits to login with the edit return path", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue(null);

    await expect(Page(routeProps())).rejects.toThrow(
      "redirect:/login?returnTo=%2Fja%2Fwiki%2Fgr-aurora-echo%3Fedit%3D1",
    );
  });

  it("keeps allowed edit query values in the login return path", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue(null);

    await expect(Page(routeProps({ themeColor: "#d94f70" }))).rejects.toThrow(
      "redirect:/login?returnTo=%2Fja%2Fwiki%2Fgr-aurora-echo%3Fedit%3D1%26themeColor%3D%2523d94f70",
    );
  });

  it("redirects pending accounts to setup before loading Wiki data", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "identity-1",
      account: { status: "pending" },
    });

    await expect(Page(routeProps())).rejects.toThrow(
      "redirect:/admin?authReturnTo=%2Fja%2Fwiki%2Fgr-aurora-echo%3Fedit%3D1",
    );
    expect(mocks.getCurrentWikiPrincipalForRequest).not.toHaveBeenCalled();
    expect(mocks.loadDraftWikiState).not.toHaveBeenCalled();
  });

  it("redirects edits to admin with the edit return path when the principal is missing", async () => {
    mocks.getCurrentWikiPrincipalForRequest.mockResolvedValue({ status: "missing" });

    await expect(Page(routeProps())).rejects.toThrow(
      "redirect:/admin?returnTo=%2Fja%2Fwiki%2Fgr-aurora-echo%3Fedit%3D1",
    );
  });

  it("loads the draft when identity and principal are available without a gate query", async () => {
    await expect(Page(routeProps())).rejects.toThrow("redirect:/wiki/draft-1/edit?resourceType=group");

    expect(mocks.getCurrentWikiPrincipalForRequest).toHaveBeenCalledWith({
      cookieHeader: "session=abc",
    });
    expect(mocks.loadDraftWikiState).toHaveBeenCalledWith("ja", "gr-aurora-echo", {
      Cookie: "session=abc",
    });
  });
  it("prepares first-time creation without redirecting before an ID exists", async () => {
    mocks.loadDraftWikiState.mockResolvedValue({ status: "needs-creation", requestBody: { language: "ja", slug: "gr-aurora-echo" } });
    render(await Page(routeProps()));
    expect(screen.getByTestId("wiki-edit-page")).toHaveTextContent("needs-creation");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("preserves the preview theme when redirecting an existing draft", async () => {
    await expect(Page(routeProps({ themeColor: "#d94f70" }))).rejects.toThrow(
      "redirect:/wiki/draft-1/edit?resourceType=group&themeColor=%23d94f70",
    );
  });

});
