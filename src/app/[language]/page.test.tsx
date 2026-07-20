import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LanguageHome from "./page";
import { loadPublicWikiListState, type PublicWikiListState } from "@/gateways/wiki/publicWiki";

vi.mock("@/gateways/wiki/publicWiki", async () => {
  const actual = await vi.importActual<typeof import("@/gateways/wiki/publicWiki")>(
    "@/gateways/wiki/publicWiki",
  );

  return {
    ...actual,
    loadPublicWikiListState: vi.fn(),
  };
});

const state: PublicWikiListState = {
  data: {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 1,
    wikis: [
      {
        heroImage: null,
        imageAltText: null,
        imageIdentifier: null,
        imageUrl: null,
        isHidden: false,
        keywords: null,
        language: "ja",
        metaDescription: null,
        name: "Aurora Echo",
        normalizedName: "aurora-echo",
        publishedAt: "2026-05-01T00:00:00+00:00",
        resourceType: "group",
        slug: "gr-aurora-echo",
        themeColor: null,
        title: null,
        translationSetIdentifier: "translation-1",
        updatedAt: "2026-05-02T00:00:00+00:00",
        version: 4,
        wikiIdentifier: "wiki-1",
      },
    ],
  },
  status: "success",
};

describe("language home page", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(loadPublicWikiListState).mockResolvedValue(state);
  });

  it("renders carousel sections and applies resource filters independently", async () => {
    render(
      await LanguageHome({
        params: Promise.resolve({ language: "ja" }),
        searchParams: Promise.resolve({
          createdResourceType: "talent",
          popularResourceType: "song",
          updatedResourceType: "group",
        }),
      }),
    );

    expect(loadPublicWikiListState).toHaveBeenNthCalledWith(1, "ja", {
      order: "desc",
      page: 1,
      perPage: 10,
      resourceType: "group",
      sort: "updatedAt",
    });
    expect(loadPublicWikiListState).toHaveBeenNthCalledWith(2, "ja", {
      order: "desc",
      page: 1,
      perPage: 10,
      resourceType: "talent",
      sort: "createdAt",
    });
    expect(loadPublicWikiListState).toHaveBeenNthCalledWith(3, "ja", {
      order: "desc",
      page: 1,
      perPage: 10,
      resourceType: "song",
      sort: "version",
    });
    expect(screen.getByRole("heading", { name: "最近更新されたWiki" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "新着Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "更新回数の多いWiki" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Aurora Echo/ })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "もっと見る" })[0]).toHaveAttribute(
      "href",
      "/ja/wiki?resourceType=group&sort=updatedAt&order=desc&perPage=10&page=1",
    );
    expect(screen.queryByText("もっと見る ->")).not.toBeInTheDocument();
    expect(screen.queryByText("→")).not.toBeInTheDocument();
    expect(screen.queryByText("公開Wikiトップ")).not.toBeInTheDocument();
    expect(screen.queryByText("直近で更新された公開Wikiを表示します。")).not.toBeInTheDocument();
    expect(screen.queryByText("リソース")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "適用" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wiki一覧" })).not.toBeInTheDocument();
  });

  it("does not use hidden hero images as top wiki card backgrounds", async () => {
    vi.mocked(loadPublicWikiListState).mockResolvedValue({
      ...state,
      data: {
        ...state.data,
        wikis: [
          {
            ...state.data.wikis[0],
            heroImage: null,
            imageUrl: "https://cdn.example.com/legacy-aurora-echo.webp",
            isHidden: true,
            themeColor: "#4c5cff",
          },
        ],
      },
    });

    render(
      await LanguageHome({
        params: Promise.resolve({ language: "ja" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const card = screen.getAllByRole("link", { name: /Aurora Echo/ })[0];
    expect(card.getAttribute("style") ?? "").not.toContain("url(");
    expect(card.getAttribute("style") ?? "").not.toContain("legacy-aurora-echo.webp");
  });

  it("auto-submits the section resource search when a resource is selected", async () => {
    const requestSubmit = vi.fn();
    const originalRequestSubmit = HTMLFormElement.prototype.requestSubmit;
    HTMLFormElement.prototype.requestSubmit = requestSubmit;

    try {
      render(
        await LanguageHome({
          params: Promise.resolve({ language: "ja" }),
          searchParams: Promise.resolve({}),
        }),
      );

      fireEvent.change(screen.getAllByLabelText("リソース")[0], { target: { value: "group" } });

      expect(requestSubmit).toHaveBeenCalledTimes(1);
    } finally {
      HTMLFormElement.prototype.requestSubmit = originalRequestSubmit;
    }
  });
});
