import React from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("@/gateways/identity/authIdentityBrowserApi", () => ({
  fetchCurrentAuthenticatedIdentity: identityMocks.fetchCurrentAuthenticatedIdentity,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
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

const wikiAutoCreatePrincipal = {
  ...principal,
  policies: [
    ...principal.policies,
    {
      policyIdentifier: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      name: "AGENCY_MANAGEMENT",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["AUTOMATIC_CREATE"],
          resourceTypes: ["AGENCY", "GROUP", "SONG"],
          condition: null,
        },
      ],
    },
  ],
};

const basicEditingPrincipal = {
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

const imageDeletionRequest = {
  imageIdentifier: "77777777-7777-7777-7777-777777777777",
  url: "https://upload.wikimedia.org/wikipedia/commons/example/delete.png",
  resourceType: "group",
  translationSetIdentifier: "55555555-5555-5555-5555-555555555555",
  displayOrder: 2,
  sourceUrl: "https://source.example.test/delete.png",
  sourceName: "Deletion archive",
  altText: "Deletion image",
  isHidden: true,
  uploadedAt: "2026-05-10T00:00:00Z",
  name: "Deletion Requester",
  email: "requester@example.test",
  reason: "Rights concern",
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
  isHidden: false,
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
  approveImageDeletionRequest: vi.fn().mockResolvedValue({
    imageIdentifier: imageDeletionRequest.imageIdentifier,
    isHidden: true,
  }),
  listDraftImages: vi.fn().mockResolvedValue({
    images: [draftImage],
    current_page: 1,
    last_page: 1,
    total: 1,
    per_page: 12,
  }),
  listImageDeletionRequests: vi.fn().mockResolvedValue({
    images: [imageDeletionRequest],
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
  rejectImageDeletionRequest: vi.fn().mockResolvedValue({
    imageIdentifier: imageDeletionRequest.imageIdentifier,
    rejectReason: "Reject",
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
  listManagedDraftWikis: vi.fn().mockResolvedValue({
	    wikis: [draftWiki],
	    current_page: 1,
    last_page: 1,
    total: 1,
	    per_page: 12,
	  }),
  listMyDraftWikis: vi.fn().mockResolvedValue({
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
  withdrawDraftWiki: vi.fn().mockResolvedValue({
    language: "ja",
    name: "未承認 Wiki",
    resourceType: "group",
    status: "pending",
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

const loadCropperImage = () => {
  const image = screen.getByTestId("image-cropper-image") as HTMLImageElement;

  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 100 },
    naturalHeight: { configurable: true, value: 100 },
    width: { configurable: true, value: 100 },
    height: { configurable: true, value: 100 },
  });
  fireEvent.load(image);
};

describe("MyPageClient", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,CROPPED_IMAGE");
    useAuthStore.setState({
      identity: null,
      status: "loading",
    });
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockReset();
    navigationMocks.push.mockReset();
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
    expect(screen.getByRole("button", { name: "設定" })).not.toHaveAttribute("aria-current");
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
    expect(await screen.findByRole("tab", { name: "削除申請画像" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    expect(screen.queryByText(principal.principalIdentifier)).not.toBeInTheDocument();
    expect(adapter.getCurrentPrincipal).not.toHaveBeenCalled();
  });

  it("shows profile settings and saves identityName without socialConnections", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        identityIdentifier: identity.identityIdentifier,
        identityName: "updated member",
        email: identity.email,
        language: "ja",
        profileImage: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "設定" }));
    expect(await screen.findByRole("heading", { name: "設定", level: 1 })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("tab", { name: "プロフィール" }));
    fireEvent.change(screen.getByLabelText("ログイン中ユーザー名"), {
      target: { value: "updated member" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          identityName: "updated member",
          language: "ja",
        }),
      }),
    ));
    expect(fetchMock.mock.calls[0]?.[1]?.body).not.toContain("socialConnections");
    expect(await screen.findByRole("status")).toHaveTextContent("設定を保存しました。");
    expect(useAuthStore.getState().identity).toMatchObject({
      identityName: "updated member",
      profileImage: null,
    });
  });

  it("sends selected profile image as base64EncodedImage when saving profile settings", async () => {
    function MockFileReader(this: {
      onload: (() => void) | null;
      onerror: (() => void) | null;
      readAsDataURL: () => void;
      result: string | ArrayBuffer | null;
    }) {
      this.onload = null;
      this.onerror = null;
      this.result = null;
      this.readAsDataURL = () => {
        this.result = "data:image/png;base64,PROFILE_IMAGE";
        this.onload?.();
      };
    }

    vi.stubGlobal("FileReader", MockFileReader);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        identityIdentifier: identity.identityIdentifier,
        identityName: identity.identityName,
        email: identity.email,
        language: "ja",
        profileImage: "https://images.example.test/member.png",
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "設定" }));
    fireEvent.click(await screen.findByRole("tab", { name: "プロフィール" }));
    fireEvent.change(screen.getByLabelText("画像を選択"), {
      target: { files: [new File(["image"], "profile.png", { type: "image/png" })] },
    });
    await screen.findByText("プロフィール画像を切り取る");
    loadCropperImage();
    fireEvent.click(screen.getByRole("button", { name: "切り取りを確定" }));
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "プロフィール画像プレビュー" })).toHaveAttribute(
        "src",
        "data:image/png;base64,CROPPED_IMAGE",
      ),
    );
    expect(screen.getByLabelText("画像を選択")).toHaveClass("sr-only");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          identityName: "member",
          language: "ja",
          base64EncodedImage: "data:image/png;base64,CROPPED_IMAGE",
        }),
      }),
    ));
  });

  it("sends null base64EncodedImage when deleting the profile image", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        identityIdentifier: identity.identityIdentifier,
        identityName: identity.identityName,
        email: identity.email,
        language: "ja",
        profileImage: "https://images.example.test/stale-member.png",
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={{
          ...identity,
          profileImage: "https://images.example.test/member.png",
        }}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "設定" }));
    fireEvent.click(await screen.findByRole("tab", { name: "プロフィール" }));
    expect(screen.getByRole("img", { name: "プロフィール画像プレビュー" })).toHaveAttribute(
      "src",
      "https://images.example.test/member.png",
    );

    fireEvent.click(screen.getByRole("button", { name: "画像を削除" }));
    expect(screen.queryByRole("img", { name: "プロフィール画像プレビュー" })).not.toBeInTheDocument();
    expect(screen.getByText("画像なし")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          identityName: "member",
          language: "ja",
          base64EncodedImage: null,
        }),
      }),
    ));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("設定を保存しました。"));
    expect(screen.queryByRole("img", { name: "プロフィール画像プレビュー" })).not.toBeInTheDocument();
    expect(useAuthStore.getState().identity).toMatchObject({
      identityName: "member",
      profileImage: null,
    });
  });

  it("saves language settings through the identity update API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        identityIdentifier: identity.identityIdentifier,
        identityName: identity.identityName,
        email: identity.email,
        language: "en",
        profileImage: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "設定" }));
    fireEvent.click(await screen.findByRole("tab", { name: "言語" }));
    fireEvent.change(screen.getByLabelText("言語"), { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          identityName: "member",
          language: "en",
        }),
      }),
    ));
  });

  it("creates a draft wiki from the dialog using the selected language defaulted from the header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          language: "ja",
          name: "New Wiki",
          resourceType: "group",
          status: "pending",
          wikiIdentifier: "88888888-8888-4888-8888-888888888888",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText("言語")).toHaveValue("ja");

    fireEvent.change(within(dialog).getByLabelText("言語"), {
      target: { value: "en" },
    });
    fireEvent.change(within(dialog).getByLabelText("名前"), {
      target: { value: "New Wiki" },
    });
    fireEvent.change(within(dialog).getByLabelText("Slug"), {
      target: { value: "new-wiki" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "新規作成" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/wiki/draft-wikis",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            language: "en",
            resourceType: "group",
            slug: "gr-new-wiki",
            basic: {
              name: "New Wiki",
              normalizedName: "",
              resourceType: "group",
            },
            sections: [],
          }),
        }),
      ),
    );
    expect(navigationMocks.push).toHaveBeenCalledWith("/en/wiki/gr-new-wiki/edit");
  });

  it("does not show the auto-create mode for principals with only basic editing", async () => {
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: basicEditingPrincipal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });

    expect(within(dialog).queryByRole("button", { name: "自動生成" })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: "キャンセル" })).toHaveLength(1);
    expect(within(dialog).getByRole("button", { name: "新規作成" })).toBeInTheDocument();
  });

  it("shows the auto-create switch only when automatic create is allowed", async () => {
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiAutoCreatePrincipal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });

    expect(within(dialog).getByRole("button", { name: "自動生成" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "空の下書き" })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: "キャンセル" })).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole("button", { name: "自動生成" }));
    expect(within(dialog).getByRole("button", { name: "手動作成" })).toBeInTheDocument();
  });

  it("switches related Wiki fields by resource type in auto-create mode", async () => {
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiAutoCreatePrincipal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });
    fireEvent.click(within(dialog).getByRole("button", { name: "自動生成" }));

    expect(within(dialog).getByLabelText("関連事務所 keyword")).toBeEnabled();
    expect(within(dialog).queryByLabelText("関連グループ keyword")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("選択肢はまだありません")).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("リソース種別"), {
      target: { value: "song" },
    });

    expect(within(dialog).getByLabelText("関連事務所 keyword")).toBeEnabled();
    expect(within(dialog).getByLabelText("関連グループ keyword")).toBeEnabled();
    expect(within(dialog).getByLabelText("関連タレント keyword")).toBeEnabled();
  });

  it("auto-creates a draft wiki with the normalized request slug and navigates with that slug", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/wiki/master-search")) {
        const parsedUrl = new URL(url, "https://app.example.test");
        const resourceType = parsedUrl.searchParams.get("resourceType");
        const item = resourceType === "agency"
          ? { id: "agency-wiki-1", name: "JYP Entertainment", slug: "ag-jyp", resourceType: "agency" }
          : resourceType === "group"
            ? { id: "group-wiki-1", name: "TWICE", slug: "gr-twice", resourceType: "group" }
            : { id: "talent-wiki-1", name: "MOMO", slug: "tl-momo", resourceType: "talent" };

        return Promise.resolve(
          new Response(JSON.stringify({ wikis: [item] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            language: "ja",
            name: "Generated Wiki",
            resourceType: "song",
            status: "pending",
            wikiIdentifier: "99999999-9999-4999-8999-999999999999",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiAutoCreatePrincipal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });
    fireEvent.click(within(dialog).getByRole("button", { name: "自動生成" }));
    fireEvent.change(within(dialog).getByLabelText("リソース種別"), {
      target: { value: "song" },
    });

    const searchAndSelect = async (label: string, keyword: string, option: string) => {
      const input = within(dialog).getByLabelText(`${label} keyword`);
      fireEvent.change(input, {
        target: { value: keyword },
      });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(option) }));
    };

    await searchAndSelect("関連事務所", "jyp", "JYP Entertainment");
    await searchAndSelect("関連グループ", "twice", "TWICE");
    await searchAndSelect("関連タレント", "momo", "MOMO");

    fireEvent.change(within(dialog).getByLabelText("名前"), {
      target: { value: "Generated Wiki" },
    });
    fireEvent.change(within(dialog).getByLabelText("Slug"), {
      target: { value: "generated-wiki" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "自動生成で作成" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/wiki/draft-wikis/auto-create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            resourceType: "song",
            language: "ja",
            name: "Generated Wiki",
            slug: "sg-generated-wiki",
            agencyIdentifier: "agency-wiki-1",
            groupIdentifiers: ["group-wiki-1"],
            talentIdentifiers: ["talent-wiki-1"],
          }),
        }),
      ),
    );
    expect(navigationMocks.push).toHaveBeenCalledWith("/ja/wiki/sg-generated-wiki/edit");
  });

  it("keeps the auto-create dialog open when auto-create fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "auto-create failed" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: wikiAutoCreatePrincipal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });
    fireEvent.click(within(dialog).getByRole("button", { name: "自動生成" }));
    fireEvent.change(within(dialog).getByLabelText("名前"), {
      target: { value: "Generated Wiki" },
    });
    fireEvent.change(within(dialog).getByLabelText("Slug"), {
      target: { value: "generated-wiki" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "自動生成で作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("auto-create failed");
    expect(screen.getByRole("dialog", { name: "Wikiを新規作成" })).toBeInTheDocument();
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });

  it("keeps the create dialog open when draft wiki creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "slug already exists" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "新規作成" }));
    const dialog = screen.getByRole("dialog", { name: "Wikiを新規作成" });

    fireEvent.change(within(dialog).getByLabelText("名前"), {
      target: { value: "Existing Wiki" },
    });
    fireEvent.change(within(dialog).getByLabelText("Slug"), {
      target: { value: "existing-wiki" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "新規作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("slug already exists");
    expect(screen.getByRole("dialog", { name: "Wikiを新規作成" })).toBeInTheDocument();
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });

  it("refetches identity on activation when the initial payload has no account id", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });
    const identityWithoutAccount = {
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      identityName: "member",
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
      "/ja/wiki/review-wiki",
    );
    expect(screen.queryByText("group")).not.toBeInTheDocument();
    expect(screen.queryByText("under_review")).not.toBeInTheDocument();
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
  });


  it("shows image deletion request tab after draft images and requires rejection reasons", async () => {
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

    const tabs = await screen.findAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toContain("未承認の画像");
    expect(tabs.map((tab) => tab.textContent)).toContain("削除申請画像");
    expect(tabs.findIndex((tab) => tab.textContent === "削除申請画像")).toBe(
      tabs.findIndex((tab) => tab.textContent === "未承認の画像") + 1,
    );

    fireEvent.click(screen.getByRole("tab", { name: "削除申請画像" }));
    await waitFor(() =>
      expect(draftImageAdapter.listImageDeletionRequests).toHaveBeenCalledWith({
        fallbackErrorMessage: "削除申請画像一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
      }),
    );
    expect(await screen.findByText("Deletion Requester")).toBeInTheDocument();
    expect(screen.getByText("requester@example.test")).toBeInTheDocument();
    expect(screen.getByText("Rights concern")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "削除を承認" }));

    await waitFor(() =>
      expect(draftImageAdapter.approveImageDeletionRequest).toHaveBeenCalledWith({
        fallbackErrorMessage: "画像削除申請を承認できませんでした。",
        imageIdentifier: imageDeletionRequest.imageIdentifier,
      }),
    );
    expect(await screen.findByText("削除申請画像はありません")).toBeInTheDocument();
  });

  it("rejects image deletion requests and removes reviewed items", async () => {
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

    fireEvent.click(await screen.findByRole("tab", { name: "削除申請画像" }));
    expect(await screen.findByText("Deletion Requester")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "削除を却下" }));
    const dialog = screen.getByRole("dialog", { name: "画像削除申請を却下" });
    fireEvent.change(within(dialog).getByLabelText("拒否理由"), {
      target: { value: "Keep this image" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "送信" }));

    await waitFor(() =>
      expect(draftImageAdapter.rejectImageDeletionRequest).toHaveBeenCalledWith({
        fallbackErrorMessage: "画像削除申請を却下できませんでした。",
        imageIdentifier: imageDeletionRequest.imageIdentifier,
        requestBody: { rejectReason: "Keep this image" },
      }),
    );
    expect(await screen.findByText("削除申請画像はありません")).toBeInTheDocument();
  });

  it("shows review errors without removing image deletion requests", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      approveImageDeletionRequest: vi.fn().mockRejectedValue(new Error("承認に失敗しました")),
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

    fireEvent.click(await screen.findByRole("tab", { name: "削除申請画像" }));
    expect(await screen.findByText("Deletion Requester")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "削除を承認" }));

    expect(await screen.findByText("承認に失敗しました")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Deletion Requester")).toBeInTheDocument();
  });

  it("does not preview image deletion request URLs that are outside the trusted image host policy", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      listImageDeletionRequests: vi.fn().mockResolvedValue({
        images: [{ ...imageDeletionRequest, url: "https://tracker.example.test/delete.png" }],
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

    fireEvent.click(await screen.findByRole("tab", { name: "削除申請画像" }));

    expect(await screen.findByText("画像URLを確認できないためプレビューを表示できません。")).toBeInTheDocument();
    expect(screen.queryByAltText("Deletion image")).not.toBeInTheDocument();
  });

  it("hides image deletion request tab for principals without image review permission", async () => {
    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={createDraftWikiAdapter()}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal: basicEditingPrincipal }}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByRole("tab", { name: "編集中のWiki" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "削除申請画像" })).not.toBeInTheDocument();
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
    expect(draftWikiAdapter.listMyDraftWikis).not.toHaveBeenCalled();
    expect(draftWikiAdapter.listManagedDraftWikis).not.toHaveBeenCalled();
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
      expect(draftWikiAdapter.listMyDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        statuses: ["under_review"],
      }),
    );
    expect(screen.getByRole("link", { name: "編集中 Wiki" })).toHaveAttribute(
      "href",
      "/wiki/ja/gr-review-wiki/edit",
    );
  });

  it("withdraws a submitted draft wiki and removes it from the list", async () => {
    const submittedWiki = {
      ...draftWiki,
      name: "申請中 Wiki",
      status: "under_review" as const,
    };
    const draftWikiAdapter = createDraftWikiAdapter({
      listMyDraftWikis: vi.fn().mockImplementation(({ statuses }) => Promise.resolve({
        wikis: statuses.includes("under_review") ? [submittedWiki] : [],
        current_page: 1,
        last_page: 1,
        total: statuses.includes("under_review") ? 1 : 0,
        per_page: 12,
      })),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
          approvedWikis: emptyDraftWikiListState,
          editingWikis: emptyDraftWikiListState,
          submittedWikis: {
            ...draftWikiListState,
            wikis: [submittedWiki],
          },
          unapprovedWikis: emptyDraftWikiListState,
          untranslatedWikis: emptyDraftWikiListState,
        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "申請中のWiki" }));
    expect(await screen.findByRole("button", { name: "取り下げ" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取り下げ" }));

    await waitFor(() =>
      expect(draftWikiAdapter.withdrawDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki の申請を取り下げできませんでした。",
        wikiId: draftWiki.wikiIdentifier,
      }),
    );
    expect(await screen.findByText("申請中のWikiはありません")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "編集中のWiki" }));
    await waitFor(() =>
      expect(draftWikiAdapter.listMyDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        statuses: ["pending", "rejected"],
      }),
    );
  });

  it("shows a retryable error when submitted draft wiki withdrawal fails", async () => {
    const submittedWiki = {
      ...draftWiki,
      name: "申請中 Wiki",
      status: "under_review" as const,
    };
    const draftWikiAdapter = createDraftWikiAdapter({
      listMyDraftWikis: vi.fn().mockResolvedValue({
        wikis: [submittedWiki],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
      withdrawDraftWiki: vi.fn().mockRejectedValue(new Error("wiki withdraw failed")),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
          approvedWikis: emptyDraftWikiListState,
          editingWikis: emptyDraftWikiListState,
          submittedWikis: {
            ...draftWikiListState,
            wikis: [submittedWiki],
          },
          unapprovedWikis: emptyDraftWikiListState,
          untranslatedWikis: emptyDraftWikiListState,
        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "申請中のWiki" }));
    fireEvent.click(await screen.findByRole("button", { name: "取り下げ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("wiki withdraw failed");
    expect(screen.getByRole("button", { name: "取り下げ" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "申請中 Wiki" })).toBeInTheDocument();
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
        requestBody: {},
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
      listManagedDraftWikis: vi.fn().mockResolvedValue({
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
      expect(draftWikiAdapter.listManagedDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        statuses: ["under_review"],
      }),
    );
    expect(await screen.findByRole("link", { name: "未承認 Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "未承認 Wiki" }).closest("article")?.getAttribute("style")).toContain(
      "--wiki-page-background-light",
    );
    expect(screen.getByRole("button", { name: "承認" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "却下" })).toBeInTheDocument();
  });

  it("approves an unapproved draft wiki and removes it from the list", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listManagedDraftWikis: vi.fn().mockResolvedValue({
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
      listManagedDraftWikis: vi.fn().mockResolvedValue({
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
      expect(draftWikiAdapter.listManagedDraftWikis).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki 下書き一覧を読み込めませんでした。",
        page: 1,
        perPage: 12,
        statuses: ["approved"],
      }),
    );
    expect(await screen.findByRole("link", { name: "承認済み Wiki" })).toBeInTheDocument();
	  expect(screen.getByRole("button", { name: "公開" })).toBeInTheDocument();
	  expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
	  expect(screen.queryByRole("button", { name: "却下" })).not.toBeInTheDocument();
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
      "削除申請画像",
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
      listManagedDraftWikis: vi.fn().mockResolvedValue({
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

  it("opens a reject reason dialog before rejecting an unapproved draft wiki", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listManagedDraftWikis: vi.fn().mockResolvedValue({
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
    fireEvent.click(await screen.findByRole("button", { name: "却下" }));
    const dialog = await screen.findByRole("dialog", { name: "Wikiを却下" });

    expect(draftWikiAdapter.rejectDraftWiki).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "却下理由を送信" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("却下理由"), {
      target: { value: "  内容が不足しています。  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "却下理由を送信" }));

    await waitFor(() =>
      expect(draftWikiAdapter.rejectDraftWiki).toHaveBeenCalledWith({
        fallbackErrorMessage: "Wiki を却下できませんでした。",
        requestBody: {
          resourceType: "group",
          rejectionReason: "内容が不足しています。",
        },
        wikiId: draftWiki.wikiIdentifier,
      }),
    );
    expect(await screen.findByText("未承認のWikiはありません")).toBeInTheDocument();
  });



  it("shows rejection reason icon only for draft wikis with a non-empty reason", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listMyDraftWikis: vi.fn().mockResolvedValue({
        wikis: [
          {
            ...draftWiki,
            name: "却下理由あり Wiki",
            rejectionReason: "内容が不足しています。",
          },
          {
            ...draftWiki,
            wikiIdentifier: "99999999-8888-8888-8888-888888888888",
            name: "却下理由なし Wiki",
            rejectionReason: null,
          },
        ],
        current_page: 1,
        last_page: 1,
        total: 2,
        per_page: 12,
      }),
    });

    renderWithQueryClient(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        draftWikiAdapter={draftWikiAdapter}
        initialDraftWikis={{
          approvedWikis: emptyDraftWikiListState,
          editingWikis: {
            ...draftWikiListState,
            pageInfo: {
              current_page: 1,
              last_page: 1,
              total: 2,
            },
            wikis: [
              {
                ...draftWiki,
                name: "却下理由あり Wiki",
                rejectionReason: "内容が不足しています。",
              },
              {
                ...draftWiki,
                wikiIdentifier: "99999999-8888-8888-8888-888888888888",
                name: "却下理由なし Wiki",
                rejectionReason: null,
              },
            ],
          },
          submittedWikis: emptyDraftWikiListState,
          unapprovedWikis: emptyDraftWikiListState,
          untranslatedWikis: emptyDraftWikiListState,
        }}
        initialIdentity={identity}
        initialPrincipalState={{ status: "available", principal }}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByRole("link", { name: "却下理由あり Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "却下理由なし Wiki" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "却下理由を表示" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "却下理由を表示" }));
    const dialog = await screen.findByRole("dialog", { name: "却下理由" });

    expect(within(dialog).getByText("内容が不足しています。")).toBeInTheDocument();
  });

  it("links an unapproved draft wiki with a published wiki to the diff page", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listManagedDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          publishedWikiIdentifier: "published-wiki-1",
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

    expect(await screen.findByRole("link", { name: "差分を確認" })).toHaveAttribute(
      "href",
      "/wiki/diff/88888888-8888-8888-8888-888888888888?resourceType=group",
    );
  });

  it("disables the diff action for an unapproved draft wiki without a published wiki", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      listManagedDraftWikis: vi.fn().mockResolvedValue({
        wikis: [{
          ...draftWiki,
          publishedWikiIdentifier: null,
          status: "under_review",
          name: "新規 Wiki",
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

    expect(await screen.findByRole("button", { name: "差分を確認" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "差分を確認" })).not.toBeInTheDocument();
  });

  it("shows a retryable error when draft wiki review fails", async () => {
    const draftWikiAdapter = createDraftWikiAdapter({
      approveDraftWiki: vi.fn().mockRejectedValue(new Error("wiki approve failed")),
      listManagedDraftWikis: vi.fn().mockResolvedValue({
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
    fireEvent.click(await screen.findByRole("button", { name: "却下" }));

    await waitFor(() =>
      expect(draftImageAdapter.rejectDraftImage).toHaveBeenCalledWith({
        fallbackErrorMessage: "画像を却下できませんでした。",
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
    fireEvent.click(await screen.findByRole("button", { name: "却下" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("reject failed");
    expect(screen.getByRole("button", { name: "却下" })).toBeEnabled();
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

  it("returns to the original edit page after creating a principal when returnTo is provided", async () => {
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
        returnTo="/ja/wiki/gr-review-wiki/edit"
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Wiki collaborator を有効化" }));

    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith("/ja/wiki/gr-review-wiki/edit"),
    );
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
      identityName: "member",
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
