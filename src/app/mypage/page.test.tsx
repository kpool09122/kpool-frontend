import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MyPageClient,
  type MyPageDraftImageAdapter,
  type MyPagePrincipalAdapter,
} from "./MyPageClient";

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
};

const draftImage = {
  imageIdentifier: "44444444-4444-4444-4444-444444444444",
  publishedImageIdentifier: null,
  url: "https://images.example.test/review.png",
  resourceType: "group",
  wikiIdentifier: "55555555-5555-5555-5555-555555555555",
  imageUsage: "wiki_editor",
  displayOrder: 1,
  sourceUrl: "",
  sourceName: "review.png",
  altText: "Review image",
  status: "under_review" as const,
  uploadedAt: "2026-05-09T00:00:00Z",
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
  listDraftImages: vi.fn().mockResolvedValue({
    images: [draftImage],
    current_page: 1,
    last_page: 1,
    total: 1,
    per_page: 12,
  }),
  ...overrides,
});

describe("MyPageClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the sidebar with Wiki selected by default", async () => {
    const adapter = createAdapter();

    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identity}
        principalAdapter={adapter}
      />,
    );

    expect(screen.getByRole("complementary", { name: "マイページメニュー" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "マイページメニューを閉じる" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "概要" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wiki" })).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(adapter.getCurrentPrincipal).toHaveBeenCalledOnce());
  });

  it("collapses and expands the sidebar with a persistent toggle", () => {
    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identity}
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

  it("loads the current principal on the default Wiki page", async () => {
    const adapter = createAdapter();

    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identity}
        principalAdapter={adapter}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Wiki", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "未承認の画像" })).toBeInTheDocument();
    expect(screen.queryByText(principal.principalIdentifier)).not.toBeInTheDocument();
    expect(adapter.getCurrentPrincipal).toHaveBeenCalledOnce();
  });

  it("shows the Wiki subheader tab and loads under review draft images", async () => {
    const draftImageAdapter = createDraftImageAdapter();

    render(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        initialIdentity={identity}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Wiki", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: "Wiki タブ" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "未承認の画像" })).toHaveAttribute(
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
    expect(screen.getByText("Review image")).toBeInTheDocument();
    expect(screen.getByText("under_review")).toBeInTheDocument();
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
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

    render(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        initialIdentity={identity}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByText("未承認の画像はありません")).toBeInTheDocument();
  });

  it("shows the draft image load error state", async () => {
    const draftImageAdapter = createDraftImageAdapter({
      listDraftImages: vi.fn().mockRejectedValue(new Error("draft image failure")),
    });

    render(
      <MyPageClient
        draftImageAdapter={draftImageAdapter}
        initialIdentity={identity}
        principalAdapter={createAdapter()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("draft image failure");
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });

  it("shows the activation guide when the current principal is missing", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });

    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identity}
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

    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identity}
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

    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identity}
        principalAdapter={adapter}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wiki principal request failed with status 500.",
    );
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });

  it("does not submit principal creation when accountId is unavailable", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });
    const identityWithoutAccount = {
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      username: "member",
      email: "member@example.com",
      language: "ja",
    };

    render(
      <MyPageClient
        draftImageAdapter={createDraftImageAdapter()}
        initialIdentity={identityWithoutAccount}
        principalAdapter={adapter}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "principal 作成に必要な accountId を取得できません。",
    );
    expect(screen.getByRole("button", { name: "Wiki collaborator を有効化" })).toBeDisabled();
    expect(adapter.createPrincipal).not.toHaveBeenCalled();
  });
});
