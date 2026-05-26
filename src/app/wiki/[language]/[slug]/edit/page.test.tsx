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

import Page from "./page";

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
      data: {},
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the draft directly when the edit auth gate is absent", async () => {
    render(await Page(routeProps()));

    expect(screen.getByTestId("wiki-edit-page")).toHaveTextContent("success");
    expect(mocks.fetchAuthenticatedIdentity).not.toHaveBeenCalled();
    expect(mocks.getCurrentWikiPrincipalForRequest).not.toHaveBeenCalled();
    expect(mocks.loadDraftWikiState).toHaveBeenCalledWith("ja", "gr-aurora-echo");
  });

  it("redirects gated unauthenticated edits to login with the edit return path", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue(null);

    await expect(Page(routeProps({ authGate: "1" }))).rejects.toThrow(
      "redirect:/login?returnTo=%2Fwiki%2Fja%2Fgr-aurora-echo%2Fedit%3FauthGate%3D1",
    );
  });

  it("redirects gated edits to mypage when the principal is missing", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "identity-1",
    });
    mocks.getCurrentWikiPrincipalForRequest.mockResolvedValue({ status: "missing" });

    await expect(Page(routeProps({ authGate: "1" }))).rejects.toThrow(
      "redirect:/mypage",
    );
  });

  it("loads the draft for gated edits when identity and principal are available", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "identity-1",
    });
    mocks.getCurrentWikiPrincipalForRequest.mockResolvedValue({
      status: "available",
      principal: {},
    });

    render(await Page(routeProps({ authGate: "1" })));

    expect(screen.getByTestId("wiki-edit-page")).toHaveTextContent("success");
    expect(mocks.getCurrentWikiPrincipalForRequest).toHaveBeenCalledWith({
      cookieHeader: "session=abc",
    });
    expect(mocks.loadDraftWikiState).toHaveBeenCalledWith("ja", "gr-aurora-echo", {
      Cookie: "session=abc",
    });
  });
});
