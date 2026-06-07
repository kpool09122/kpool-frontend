import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  loadDraftWikiDiffState: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/gateways/wiki/draftWiki", () => ({
  loadDraftWikiDiffState: mocks.loadDraftWikiDiffState,
}));

vi.mock("../../[slug]/WikiDiffPage", () => ({
  WikiDiffPage: ({
    draftWikiState,
    language,
    publicWikiState,
  }: {
    draftWikiState: { status: string; message?: string };
    language: string;
    publicWikiState: { status: string };
  }) => (
    <div data-testid="wiki-diff-page">
      <span>{draftWikiState.status}</span>
      <span>{publicWikiState.status}</span>
      <span>{language}</span>
      {draftWikiState.message ? <span>{draftWikiState.message}</span> : null}
    </div>
  ),
}));

import Page, { dynamic, revalidate } from "./page";

const routeProps = (
  searchParams: Record<string, string | string[]> = { resourceType: "group" },
) => ({
  params: Promise.resolve({
    wikiId: "88888888-8888-8888-8888-888888888888",
  }),
  searchParams: Promise.resolve(searchParams),
});

describe("Wiki identifier diff route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      toString: () => "session=abc",
    });
    mocks.loadDraftWikiDiffState.mockResolvedValue({
      draftWikiState: { status: "success", data: {} },
      language: "ja",
      publicWikiState: { status: "success", data: {} },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("disables route caching for realtime draft diffs", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("loads diff state with resource type, draft wiki identifier, and forwarded cookies", async () => {
    render(await Page(routeProps()));

    expect(screen.getByTestId("wiki-diff-page")).toHaveTextContent("success");
    expect(mocks.loadDraftWikiDiffState).toHaveBeenCalledWith(
      "group",
      "88888888-8888-8888-8888-888888888888",
      {
        Cookie: "session=abc",
      },
    );
  });

  it("renders an error when resource type is missing", async () => {
    render(await Page(routeProps({})));

    expect(screen.getByTestId("wiki-diff-page")).toHaveTextContent(
      "Draft wiki resource type is required.",
    );
    expect(mocks.loadDraftWikiDiffState).not.toHaveBeenCalled();
  });
});
