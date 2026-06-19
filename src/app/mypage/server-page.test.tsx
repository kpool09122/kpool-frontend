import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  fetchAuthenticatedIdentity: vi.fn(),
  getInitialWikiPrincipalForRequest: vi.fn(),
  loadInitialDraftWikisForRequest: vi.fn(),
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
  loadInitialDraftWikisForRequest: mocks.loadInitialDraftWikisForRequest,
}));

vi.mock("@/gateways/wiki/wikiPrincipal", () => ({
  getInitialWikiPrincipalForRequest: mocks.getInitialWikiPrincipalForRequest,
}));

vi.mock("./MyPageClient", () => ({
  MyPageClient: ({ returnTo }: { returnTo: string | null }) => (
    <div data-testid="mypage-client">{returnTo ?? "no-return"}</div>
  ),
}));

import MyPage from "./page";

describe("MyPage server route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      toString: () => "session=abc",
    });
    mocks.fetchAuthenticatedIdentity.mockResolvedValue({
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      username: "member",
      email: "member@example.com",
      language: "ja",
    });
    mocks.getInitialWikiPrincipalForRequest.mockResolvedValue({ status: "missing" });
  });

  it("redirects unauthenticated requests to login with the mypage return destination", async () => {
    mocks.fetchAuthenticatedIdentity.mockResolvedValue(null);

    await expect(MyPage()).rejects.toThrow("redirect:/login?returnTo=/mypage");
    expect(mocks.getInitialWikiPrincipalForRequest).not.toHaveBeenCalled();
  });

  it("passes safe returnTo query values to the client", async () => {
    render(
      await MyPage({
        searchParams: Promise.resolve({
          returnTo: "/wiki/ja/gr-aurora-echo/edit",
        }),
      }),
    );

    expect(screen.getByTestId("mypage-client")).toHaveTextContent(
      "/wiki/ja/gr-aurora-echo/edit",
    );
  });
});
