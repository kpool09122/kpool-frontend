import React from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MyPageClient } from "./MyPageClient";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchCurrentAuthenticatedIdentity } from "@/gateways/identity/authIdentityBrowserApi";
import type {
  MyPageDraftImageAdapter,
  MyPageDraftWikiAdapter,
  MyPagePrincipalAdapter,
} from "@/gateways/mypage/myPageAdapters";

const identityMocks = vi.hoisted(() => ({
  fetchCurrentAuthenticatedIdentity: vi.fn(),
}));

vi.mock("@/gateways/identity/authIdentityBrowserApi", () => ({
  fetchCurrentAuthenticatedIdentity: identityMocks.fetchCurrentAuthenticatedIdentity,
}));

const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  username: "member",
  email: "member@example.com",
  language: "ja",
  accountId: "22222222-2222-2222-2222-222222222222",
};

const principal = {
  principalIdentifier: "33333333-3333-3333-3333-333333333333",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  isDelegatedPrincipal: false,
  isEnabled: true,
  policies: [
    {
      policyIdentifier: "66666666-6666-6666-6666-666666666666",
      name: "IMAGE_REVIEW",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["APPROVE", "REJECT"],
          resourceTypes: ["IMAGE"],
          condition: null,
        },
      ],
    },
  ],
};

const wikiReviewPrincipal = {
  ...principal,
  policies: [
    ...principal.policies,
    {
      policyIdentifier: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "GROUP_MANAGEMENT",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["APPROVE", "REJECT"],
          resourceTypes: ["GROUP"],
          condition: null,
        },
      ],
    },
  ],
};

const wikiPublishPrincipal = {
  ...principal,
  policies: [
    ...principal.policies,
    {
      policyIdentifier: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      name: "GROUP_PUBLISH",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["PUBLISH"],
          resourceTypes: ["GROUP"],
          condition: null,
        },
      ],
    },
  ],
};

const draftImage = {
  imageIdentifier: "44444444-4444-4444-4444-444444444444",
  publishedImageIdentifier: null,
  url: "https://images.example.test/review.png",
  resourceType: "group",
  translationSetIdentifier: "55555555-5555-5555-5555-555555555555",
  displayOrder: 1,
  sourceUrl: "https://source.example.test/review.png",
  sourceName: "K-Pool archive",
  altText: "Review image",
  wiki: {
    names: {
      ja: "レビュー対象 Wiki",
      en: "Review Wiki",
    },
    slug: "review-wiki",
  },
  status: "under_review" as const,
  uploadedAt: "2026-05-09T00:00:00Z",
};

const draftWiki = {
  wikiIdentifier: "88888888-8888-8888-8888-888888888888",
  publishedWikiIdentifier: null,
  translationSetIdentifier: "99999999-9999-9999-9999-999999999999",
  slug: "gr-review-wiki",
  language: "ja",
  resourceType: "group",
  themeColor: "#4c5cff",
  status: "pending" as const,
  name: "編集中 Wiki",
  normalizedName: "editing-wiki",
  imageIdentifier: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  imageUrl: "https://images.example.test/editing-wiki.webp",
  imageAltText: "編集中 Wiki profile",
  editedAt: "2026-05-10T00:00:00Z",
  approvedAt: null,
  translatedAt: null,
  mergedAt: null,
};

const createAdapter = (
  overrides: Partial<MyPagePrincipalAdapter> = {},
): MyPagePrincipalAdapter => ({
  getCurrentPrincipal: vi.fn().mockResolvedValue({
    status: "available",
    principal,
  }),
  createPrincipal: vi.fn().mockResolvedValue({
    status: "available",
    principal,
  }),
  ...overrides,
});

const createDraftImageAdapter = (
  overrides: Partial<MyPageDraftImageAdapter> = {},
): MyPageDraftImageAdapter => ({
  approveDraftImage: vi.fn().mockResolvedValue({
    imageIdentifier: draftImage.imageIdentifier,
    resourceType: "group",
    status: "approved",
  }),
  listDraftImages: vi.fn().mockResolvedValue({
    images: [draftImage],
    current_page: 1,
    last_page: 1,
    total: 1,
    per_page: 12,
  }),
  rejectDraftImage: vi.fn().mockResolvedValue({
    imageIdentifier: draftImage.imageIdentifier,
    resourceType: "group",
    isHidden: false,
  }),
  ...overrides,
});

const createDraftWikiAdapter = (
  overrides: Partial<MyPageDraftWikiAdapter> = {},
): MyPageDraftWikiAdapter => ({
	  approveDraftWiki: vi.fn().mockResolvedValue({
	    language: "ja",
	    name: "未承認 Wiki",
    resourceType: "group",
    status: "approved",
  }),
  deleteDraftWiki: vi.fn().mockResolvedValue(undefined),
  listDraftWikis: vi.fn().mockResolvedValue({
	    wikis: [draftWiki],
	    current_page: 1,
    last_page: 1,
    total: 1,
	    per_page: 12,
	  }),
	  listUntranslatedWikis: vi.fn().mockResolvedValue({
	    wikis: [{
	      wikiIdentifier: "aaaaaaaa-8888-8888-8888-888888888888",
	      translationSetIdentifier: "99999999-9999-9999-9999-999999999999",
	      slug: "gr-untranslated-wiki",
	      language: "ja",
	      resourceType: "group",
	      version: 3,
	      themeColor: "#4c5cff",
	      imageIdentifier: null,
	      imageUrl: null,
	      imageAltText: null,
	      name: "未翻訳 Wiki",
	      normalizedName: "untranslated-wiki",
	      publishedAt: "2026-05-10T00:00:00Z",
	      updatedAt: "2026-05-11T00:00:00Z",
	    }],
	    current_page: 1,
	    last_page: 1,
	    total: 1,
	    per_page: 12,
	  }),
  publishDraftWiki: vi.fn().mockResolvedValue({
    language: "ja",
    name: "承認済み Wiki",
    resourceType: "group",
    status: "approved",
  }),
	  rejectDraftWiki: vi.fn().mockResolvedValue({
	    language: "ja",
	    name: "未承認 Wiki",
	    resourceType: "group",
	    status: "rejected",
	  }),
	  translateDraftWiki: vi.fn().mockResolvedValue({
	    draftWikis: [],
	  }),
  ...overrides,
});

const emptyDraftWikiListState = {
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
};

const draftWikiListState = {
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: {
    current_page: 1,
    last_page: 1,
    total: 1,
  },
  wikis: [draftWiki],
};

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
};

describe("MyPageClient", () => {
  beforeEach(() => {
    useAuthStore.setState({
      identity: null,
      status: "loading",
    });
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockReset();
  });

  it("renders the sidebar with Wiki selected by default", async () => {
    const adapter = createAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={adapter}
      />,
    );

    expect(screen.getByRole("complementary", { name: "マイページメニュー" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "マイページメニューを閉じる" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "概要" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wiki" })).toHaveAttribute("aria-current", "page");
  });

  it("collapses and expands the sidebar with a persistent toggle", () => {
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "マイページメニューを閉じる" }));
    expect(
      screen.getByRole("button", { name: "マイページメニューを開く" }),
    ).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "マイページメニューを開く" }));
    expect(
      screen.getByRole("button", { name: "マイページメニューを閉じる" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("renders the default Wiki page from the initial principal state", async () => {
    const adapter = createAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={adapter}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Wiki", level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "編集中のWiki" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "申請中のWiki" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "未承認の画像" })).toBeInTheDocument();
    expect(screen.queryByText(principal.principalIdentifier)).not.toBeInTheDocument();
    expect(adapter.getCurrentPrincipal).not.toHaveBeenCalled();
  });

  it("refetches identity on activation when the initial payload has no account id", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });
    const identityWithoutAccount = {
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      username: "member",
      email: "member@example.com",
      language: "ja",
    };
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockResolvedValue({
      ...identityWithoutAccount,
      account: {
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      },
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identityWithoutAccount}
        initialPrincipalState={{ status: "missing" }}
        principalAdapter={adapter}
      />,
    );

    const activateButton = screen.getByRole("button", {
      name: "Wiki collaborator を有効化",
    });
    expect(activateButton).toBeEnabled();
    fireEvent.click(activateButton);

    await waitFor(() =>
      expect(adapter.createPrincipal).toHaveBeenCalledWith({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      }),
    );
  });

  it("shows the Wiki subheader tab and loads under review draft images", async () => {
    const draftImageAdapter = createDraftImageAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Wiki", level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByRole("tablist", { name: "Wiki タブ" }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    expect(await screen.findByRole("tab", { name: "未承認の画像" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(draftImageAdapter.listDraftImages).toHaveBeenCalledWith({
        fallbackErrorMessage: "未承認の画像一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        status: "under_review",
      }),
    );
    expect(screen.getByRole("link", { name: "K-Pool archive" })).toHaveAttribute(
      "href",
      "https://source.example.test/review.png",
    );
    expect(
      screen.queryByRole("link", { name: "https://source.example.test/review.png" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "レビュー対象 Wiki（ja）" })).toHaveAttribute(
      "href",
      "/wiki/ja/review-wiki",
    );
    expect(screen.queryByText("group")).not.toBeInTheDocument();
    expect(screen.queryByText("under_review")).not.toBeInTheDocument();
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
  });

  it("loads editing draft wikis by default and submitted draft wikis on tab selection", async () => {
    const draftWikiAdapter = createDraftWikiAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
	          approvedWikis: emptyDraftWikiListState,
	          editingWikis: draftWikiListState,
	          submittedWikis: emptyDraftWikiListState,
	          unapprovedWikis: emptyDraftWikiListState,
	          untranslatedWikis: emptyDraftWikiListState,
	        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByRole("tab", { name: "編集中のWiki" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(draftWikiAdapter.listDraftWikis).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "編集中 Wiki" })).toHaveAttribute(
      "href",
      "/wiki/ja/gr-review-wiki/edit",
    );
    expect(screen.getByRole("link", { name: "編集中 Wiki" }).closest("article")?.getAttribute("style")).toContain(
      'url("https://images.example.test/editing-wiki.webp")',
    );
    expect(screen.getByText("グループ")).toBeInTheDocument();
    expect(screen.getByText("編集中", { selector: "dd" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "申請中のWiki" }));
    await waitFor(() =>
      expect(draftWikiAdapter.listDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        onlyMine: true,
        page: 1,
        perPage: 12,
        status: "under_review",
      }),
    );
    expect(screen.getByRole("link", { name: "編集中 Wiki" })).toHaveAttribute(
      "href",
      "/wiki/ja/gr-review-wiki/edit",
    );
  });

  it("shows a delete action for editing draft wikis and skips deletion when cancelled", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const draftWikiAdapter = createDraftWikiAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
          approvedWikis: emptyDraftWikiListState,
          editingWikis: draftWikiListState,
          submittedWikis: emptyDraftWikiListState,
          unapprovedWikis: emptyDraftWikiListState,
          untranslatedWikis: emptyDraftWikiListState,
        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "削除" }));

    expect(confirm).toHaveBeenCalledWith("この Wiki 下書きを削除します。よろしいですか？");
    expect(draftWikiAdapter.deleteDraftWiki).not.toHaveBeenCalled();
    expect(screen.getByText("編集中 Wiki")).toBeInTheDocument();
  });

  it("deletes an editing draft wiki and removes it from the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const draftWikiAdapter = createDraftWikiAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
          approvedWikis: emptyDraftWikiListState,
          editingWikis: draftWikiListState,
          submittedWikis: emptyDraftWikiListState,
          unapprovedWikis: emptyDraftWikiListState,
          untranslatedWikis: emptyDraftWikiListState,
        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(draftWikiAdapter.deleteDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書きを削除できませんでした。",
        wikiId: draftWiki.wikiIdentifier,
      }),
    );
    expect(await screen.findByText("編集中のWikiはありません")).toBeInTheDocument();
  });

  it("shows a retryable error when editing draft wiki deletion fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const draftWikiAdapter = createDraftWikiAdapter({
      deleteDraftWiki: vi.fn().mockRejectedValue(new Error("wiki delete failed")),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
          approvedWikis: emptyDraftWikiListState,
          editingWikis: draftWikiListState,
          submittedWikis: emptyDraftWikiListState,
          unapprovedWikis: emptyDraftWikiListState,
          untranslatedWikis: emptyDraftWikiListState,
        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "削除" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("wiki delete failed");
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();
    expect(screen.getByText("編集中 Wiki")).toBeInTheDocument();
  });

  it("shows unapproved draft wikis only for principals with approve and reject policies", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          status: "under_review",
          name: "未承認 Wiki",
          imageIdentifier: null,
          imageUrl: null,
          imageAltText: null,
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiReviewPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiReviewPrincipal,
          }),
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認のWiki" }));
    await waitFor(() =>
      expect(draftWikiAdapter.listDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        status: "under_review",
      }),
    );
    expect(await screen.findByRole("link", { name: "未承認 Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "未承認 Wiki" }).closest("article")?.getAttribute("style")).toContain(
      "--wiki-page-background-light",
    );
    expect(screen.getByRole("button", { name: "承認" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒否" })).toBeInTheDocument();
  });

  it("approves an unapproved draft wiki and removes it from the list", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          status: "under_review",
          name: "未承認 Wiki",
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiReviewPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiReviewPrincipal,
          }),
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認のWiki" }));
    fireEvent.click(await screen.findByRole("button", { name: "承認" }));

    await waitFor(() =>
      expect(draftWikiAdapter.approveDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki を承認できませんでした。",
        requestBody: {
          resourceType: "group",
        },
        wikiId: draftWiki.wikiIdentifier,
      }),
    );
    expect(await screen.findByText("未承認のWikiはありません")).toBeInTheDocument();
  });

  it("shows approved draft wikis only for principals with publish policies", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          status: "approved",
          name: "承認済み Wiki",
          imageIdentifier: null,
          imageUrl: null,
          imageAltText: null,
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiPublishPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiPublishPrincipal,
          }),
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "承認済みWiki" }));
    await waitFor(() =>
      expect(draftWikiAdapter.listDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        status: "approved",
      }),
    );
    expect(await screen.findByRole("link", { name: "承認済み Wiki" })).toBeInTheDocument();
	  expect(screen.getByRole("button", { name: "公開" })).toBeInTheDocument();
	  expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
	  expect(screen.queryByRole("button", { name: "拒否" })).not.toBeInTheDocument();
	});

  it("shows untranslated wikis after approved wikis and translates them", async () => {
    const listUntranslatedWikis = vi
      .fn()
      .mockResolvedValueOnce({
        wikis: [{
          wikiIdentifier: "aaaaaaaa-8888-8888-8888-888888888888",
          translationSetIdentifier: "99999999-9999-9999-9999-999999999999",
          slug: "gr-untranslated-wiki",
          language: "ja",
          resourceType: "group",
          version: 3,
          themeColor: null,
          imageIdentifier: null,
          imageUrl: null,
          imageAltText: null,
          name: "未翻訳 Wiki",
          normalizedName: "untranslated-wiki",
          publishedAt: "2026-05-10T00:00:00Z",
          updatedAt: "2026-05-11T00:00:00Z",
          agencyIdentifier: "agency-1",
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      })
      .mockResolvedValueOnce({
        wikis: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 12,
      });
    const draftWikiAdapter = createDraftWikiAdapter({
      listUntranslatedWikis,
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiPublishPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiPublishPrincipal,
          }),
        })}
      />,
    );

    expect((await screen.findAllByRole("tab")).map((tab) => tab.textContent)).toEqual([
      "編集中のWiki",
      "申請中のWiki",
      "承認済みWiki",
      "未翻訳のWiki",
      "未承認の画像",
    ]);
    fireEvent.click(screen.getByRole("tab", { name: "未翻訳のWiki" }));
    await waitFor(() =>
      expect(listUntranslatedWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        order: "desc",
        page: 1,
        perPage: 12,
        sort: "updatedAt",
      }),
    );
    expect(await screen.findByRole("link", { name: "未翻訳 Wiki" })).toHaveAttribute(
      "href",
      "/wiki/ja/gr-untranslated-wiki",
    );
    expect(screen.getByRole("button", { name: "翻訳" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "翻訳" }));
    await waitFor(() =>
      expect(draftWikiAdapter.translateDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki を翻訳できませんでした。",
        requestBody: {
          agencyIdentifier: "agency-1",
          language: "ja",
          resourceType: "group",
        },
        wikiId: "aaaaaaaa-8888-8888-8888-888888888888",
      }),
    );
    await waitFor(() => expect(listUntranslatedWikis).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("未翻訳のWikiはありません")).toBeInTheDocument();
  });

  it("publishes an approved draft wiki and removes it from the list", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          status: "approved",
          name: "承認済み Wiki",
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiPublishPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiPublishPrincipal,
          }),
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "承認済みWiki" }));
    fireEvent.click(await screen.findByRole("button", { name: "公開" }));

    await waitFor(() =>
      expect(draftWikiAdapter.publishDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki を公開できませんでした。",
        requestBody: {
          resourceType: "group",
        },
        wikiId: draftWiki.wikiIdentifier,
      }),
    );
    expect(await screen.findByText("承認済みWikiはありません")).toBeInTheDocument();
  });

  it("rejects an unapproved draft wiki and removes it from the list", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          status: "under_review",
          name: "未承認 Wiki",
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiReviewPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiReviewPrincipal,
          }),
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認のWiki" }));
    fireEvent.click(await screen.findByRole("button", { name: "拒否" }));

    await waitFor(() =>
      expect(draftWikiAdapter.rejectDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki を拒否できませんでした。",
        requestBody: {
          resourceType: "group",
        },
        wikiId: draftWiki.wikiIdentifier,
      }),
    );
    expect(await screen.findByText("未承認のWikiはありません")).toBeInTheDocument();
  });

  it("shows a retryable error when draft wiki review fails", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      approveDraftWiki: vi.fn().mockRejectedValue(new Error("wiki approve failed")),
      listDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          status: "under_review",
          name: "未承認 Wiki",
        }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiReviewPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: wikiReviewPrincipal,
          }),
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認のWiki" }));
    fireEvent.click(await screen.findByRole("button", { name: "承認" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("wiki approve failed");
    expect(screen.getByRole("button", { name: "承認" })).toBeEnabled();
  });

  it("does not link dangerous draft image source URLs", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      listDraftImages: vi.fn().mockResolvedValue({
        images: [{ ...draftImage, sourceUrl: "javascript:alert(1)" }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    expect(await screen.findByText("K-Pool archive")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "K-Pool archive" })).not.toBeInTheDocument();
  });

  it("approves a draft image and removes it from the list", async () => {
    const draftImageAdapter = createDraftImageAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    fireEvent.click(await screen.findByRole("button", { name: "承認" }));

    await waitFor(() =>
      expect(draftImageAdapter.approveDraftImage).toHaveBeenCalledWith({
        fallbackErrorMessage: "画像を承認できませんでした。",
        imageIdentifier: draftImage.imageIdentifier,
      }),
    );
    expect(await screen.findByText("未承認の画像はありません")).toBeInTheDocument();
  });

  it("rejects a draft image and removes it from the list", async () => {
    const draftImageAdapter = createDraftImageAdapter();

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    fireEvent.click(await screen.findByRole("button", { name: "拒否" }));

    await waitFor(() =>
      expect(draftImageAdapter.rejectDraftImage).toHaveBeenCalledWith({
        fallbackErrorMessage: "画像を拒否できませんでした。",
        imageIdentifier: draftImage.imageIdentifier,
      }),
    );
    expect(await screen.findByText("未承認の画像はありません")).toBeInTheDocument();
  });

  it("shows a retryable error when draft image review fails", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      approveDraftImage: vi.fn().mockRejectedValue(new Error("approve failed")),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    fireEvent.click(await screen.findByRole("button", { name: "承認" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("approve failed");
    expect(screen.getByRole("button", { name: "承認" })).toBeEnabled();
  });

  it("shows a retryable error when draft image reject fails", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      rejectDraftImage: vi.fn().mockRejectedValue(new Error("reject failed")),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    fireEvent.click(await screen.findByRole("button", { name: "拒否" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("reject failed");
    expect(screen.getByRole("button", { name: "拒否" })).toBeEnabled();
  });

  it("does not show draft image tabs when policies do not allow image review", async () => {
    const basicPrincipal = {
      ...principal,
      policies: [
        {
          policyIdentifier: "77777777-7777-7777-7777-777777777777",
          name: "BASIC_EDITING",
          isSystemPolicy: true,
          statements: [
            {
              effect: "allow",
              actions: ["CREATE", "EDIT", "SUBMIT"],
              resourceTypes: ["WIKI"],
              condition: null,
            },
          ],
        },
      ],
    };

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: basicPrincipal }}
        principalAdapter={createAdapter({
          getCurrentPrincipal: vi.fn().mockResolvedValue({
            status: "available",
            principal: basicPrincipal,
          }),
        })}
      />,
    );

    expect(await screen.findByRole("tab", { name: "編集中のWiki" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "申請中のWiki" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "未承認のWiki" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "承認済みWiki" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "未承認の画像" })).not.toBeInTheDocument();
  });

  it("shows the empty state when under review draft images are empty", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      listDraftImages: vi.fn().mockResolvedValue({
        images: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    expect(await screen.findByText("未承認の画像はありません")).toBeInTheDocument();
  });

  it("shows the draft image load error state", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      listDraftImages: vi.fn().mockRejectedValue(new Error("draft image failure")),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "未承認の画像" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("draft image failure");
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });

  it("shows the activation guide when the current principal is missing", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "missing" }}
        principalAdapter={adapter}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Wiki collaborator を有効化" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("この機能を有効にするには Wiki のコラボレータになる必要があります。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "未承認の画像" })).not.toBeInTheDocument();
  });

  it("creates a principal and updates the page immediately", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
      createPrincipal: vi.fn().mockResolvedValue({ status: "available", principal }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "missing" }}
        principalAdapter={adapter}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Wiki collaborator を有効化" }));

    await waitFor(() =>
      expect(adapter.createPrincipal).toHaveBeenCalledWith({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      }),
    );
    expect(await screen.findByRole("tab", { name: "未承認の画像" })).toBeInTheDocument();
  });

  it("shows a retry path when the principal lookup fails", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({
        status: "error",
        message: "Wiki principal request failed with status 500.",
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{
          status: "error",
          message: "Wiki principal request failed with status 500.",
        }}
        principalAdapter={adapter}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wiki principal request failed with status 500.",
    );
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });

  it("does not submit principal creation when accountId remains unavailable", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });
    const identityWithoutAccount = {
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      username: "member",
      email: "member@example.com",
      language: "ja",
    };

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identityWithoutAccount}
        initialPrincipalState={{ status: "missing" }}
        principalAdapter={adapter}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Wiki collaborator を有効化" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "principal 作成に必要な accountId を取得できません。",
    );
    expect(adapter.createPrincipal).not.toHaveBeenCalled();
  });
});
