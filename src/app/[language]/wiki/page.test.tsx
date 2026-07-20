import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WikiListPage from "./page";
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

const wikiListState: PublicWikiListState = {
  data: {
    currentPage: 1,
    lastPage: 3,
    perPage: 10,
    total: 21,
    wikis: [
      {
        heroImage: null,
        imageAltText: "Aurora Echo stage",
        imageIdentifier: "image-1",
        imageUrl: "https://cdn.example.com/aurora-echo.webp",
        isHidden: false,
        keywords: null,
        language: "ja",
        metaDescription: null,
        name: "Aurora Echo",
        normalizedName: "aurora-echo",
        publishedAt: "2026-05-01T00:00:00+00:00",
        resourceType: "group",
        slug: "gr-aurora-echo",
        themeColor: "#4c5cff",
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

describe("language wiki list page", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(loadPublicWikiListState).mockResolvedValue(wikiListState);
  });

  it("loads the wiki list for the language route and keeps filters in pagination links", async () => {
    render(
      await WikiListPage({
        params: Promise.resolve({ language: "ja" }),
        searchParams: Promise.resolve({
          keyword: "aurora",
          order: "desc",
          page: "2",
          perPage: "30",
          resourceType: "group",
        }),
      }),
    );

    expect(loadPublicWikiListState).toHaveBeenCalledWith("ja", {
      keyword: "aurora",
      order: "desc",
      page: 2,
      perPage: 30,
      resourceType: "group",
      sort: "name",
    });
    expect(screen.getByLabelText("検索")).toHaveValue("aurora");
    expect(screen.getByRole("link", { name: /Aurora Echo/i })).toHaveAttribute(
      "href",
      "/ja/wiki/gr-aurora-echo",
    );
    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "href",
      "/ja/wiki?keyword=aurora&resourceType=group&sort=name&order=desc&perPage=30&page=2",
    );
  });

  it("does not use hidden hero images as wiki card backgrounds", async () => {
    vi.mocked(loadPublicWikiListState).mockResolvedValue({
      ...wikiListState,
      data: {
        ...wikiListState.data,
        wikis: [
          {
            ...wikiListState.data.wikis[0],
            heroImage: null,
            imageUrl: "https://cdn.example.com/legacy-aurora-echo.webp",
            isHidden: true,
          },
        ],
      },
    });

    render(
      await WikiListPage({
        params: Promise.resolve({ language: "ja" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const card = screen.getByRole("link", { name: /Aurora Echo/i });
    expect(card.getAttribute("style") ?? "").not.toContain("url(");
    expect(card.getAttribute("style") ?? "").not.toContain("legacy-aurora-echo.webp");
  });
});
