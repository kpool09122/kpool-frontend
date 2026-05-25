import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import Home from "./page";
import { loadPublicWikiListState } from "@/gateways/wiki/publicWiki";

const cookieState = vi.hoisted(() => ({
  savedLocale: "ja",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === "kpool-locale" ? { value: cookieState.savedLocale } : undefined,
    ),
    toString: vi.fn(() => `kpool-locale=${cookieState.savedLocale}`),
  })),
}));

vi.mock("@/gateways/identity/authIdentity", () => ({
  fetchAuthenticatedIdentity: vi.fn(),
}));

vi.mock("@/gateways/wiki/publicWiki", async () => {
  const actual = await vi.importActual<typeof import("@/gateways/wiki/publicWiki")>(
    "@/gateways/wiki/publicWiki",
  );

  return {
    ...actual,
    loadPublicWikiListState: vi.fn(),
  };
});

const wikiListState = {
  data: {
    currentPage: 1,
    lastPage: 3,
    perPage: 10,
    total: 21,
    wikis: [
      {
        language: "ja",
        name: "Aurora Echo",
        normalizedName: "aurora-echo",
        imageAltText: "Aurora Echo stage",
        imageIdentifier: "image-1",
        imageUrl: "https://cdn.example.com/aurora-echo.webp",
        publishedAt: "2026-05-01T00:00:00+00:00",
        resourceType: "group" as const,
        slug: "gr-aurora-echo",
        themeColor: "#4c5cff",
        updatedAt: "2026-05-02T00:00:00+00:00",
        version: 4,
        wikiIdentifier: "wiki-1",
      },
      {
        language: "ko",
        name: "Starlight Studio",
        normalizedName: "starlight-studio",
        publishedAt: "2026-05-03T00:00:00+00:00",
        resourceType: "agency" as const,
        slug: "ag-starlight-studio",
        themeColor: "#d94f70",
        updatedAt: "2026-05-04T00:00:00+00:00",
        version: 2,
        wikiIdentifier: "wiki-2",
      },
    ],
  },
  status: "success" as const,
};

describe("Home", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    cookieState.savedLocale = "ja";
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      email: "member@example.com",
      identityIdentifier: "identity-1",
      language: "ko",
      username: "member",
    });
    vi.mocked(loadPublicWikiListState).mockResolvedValue(wikiListState);
  });

  it("renders the wiki list and calls the API with the saved locale first", async () => {
    render(
      await Home({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(loadPublicWikiListState).toHaveBeenCalledWith("ja", {
      keyword: undefined,
      order: "asc",
      page: 1,
      perPage: 10,
      resourceType: undefined,
      sort: "name",
    });
    expect(
      screen.getByRole("heading", {
        name: "Wikiを探す",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("検索")).toHaveValue("");
    expect(screen.getByLabelText("リソース")).toHaveValue("");
    expect(screen.getByLabelText("並び替え")).toHaveValue("asc");
    expect(screen.getByLabelText("表示件数")).toHaveValue("10");
    const themedCard = screen.getByRole("link", {
      name: /グループ Aurora Echo 更新日/i,
    });
    expect(themedCard).toHaveAttribute("href", "/wiki/ja/gr-aurora-echo");
    expect(themedCard.getAttribute("style")).toContain(
      "linear-gradient(180deg, rgba(21, 36, 59, 0.78)",
    );
    expect(themedCard.getAttribute("style")).toContain(
      'url("https://cdn.example.com/aurora-echo.webp")',
    );
    const gradientCard = screen.getByRole("link", {
      name: /事務所 Starlight Studio 更新日/i,
    });
    expect(gradientCard).toHaveAttribute("href", "/wiki/ko/ag-starlight-studio");
    expect(gradientCard.getAttribute("style")).toContain(
      "--wiki-page-background-light",
    );
    expect(gradientCard.getAttribute("style")).toContain("radial-gradient");
    expect(gradientCard.getAttribute("style")).not.toContain("url(");
    expect(themedCard.getAttribute("style")).toContain(
      "border-color: rgba(255, 255, 255, 0.22)",
    );
    expect(screen.queryByText("aurora-echo")).not.toBeInTheDocument();
    expect(screen.queryByText("starlight-studio")).not.toBeInTheDocument();
    expect(screen.queryByText(/Theme token preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open Wiki Detail Demo/i)).not.toBeInTheDocument();
  });

  it("maps URL search parameters into API filters and pagination links", async () => {
    render(
      await Home({
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
    expect(screen.getByLabelText("リソース")).toHaveValue("group");
    expect(screen.getByLabelText("並び替え")).toHaveValue("desc");
    expect(screen.getByLabelText("表示件数")).toHaveValue("30");
    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "href",
      "/?keyword=aurora&resourceType=group&sort=name&order=desc&perPage=30&page=2",
    );
  });

  it("renders the home controls in English when the saved locale is English", async () => {
    cookieState.savedLocale = "en";

    render(
      await Home({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Find a wiki" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getByLabelText("Resource")).toHaveValue("");
    expect(screen.getByLabelText("Sort")).toHaveValue("asc");
    expect(screen.getByLabelText("Per page")).toHaveValue("10");
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("renders empty and error states", async () => {
    vi.mocked(loadPublicWikiListState).mockResolvedValueOnce({
      status: "empty",
    });

    const { unmount } = render(
      await Home({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Wikiが見つかりません" })).toBeInTheDocument();

    unmount();
    vi.mocked(loadPublicWikiListState).mockResolvedValueOnce({
      message: "Wiki API is not configured.",
      status: "error",
    });

    render(
      await Home({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Wiki一覧を読み込めません" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Wiki API is not configured.")).toBeInTheDocument();
  });
});
