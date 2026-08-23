import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfficialCertificationReviewClient } from "./OfficialCertificationReviewClient";

const listOfficialCertifications = vi.fn();
const reviewOfficialCertification = vi.fn();

const certificationIdentifier = "11111111-1111-4111-8111-111111111111";
const translationSetIdentifier = "22222222-2222-4222-8222-222222222222";
const wikiIdentifier = "33333333-3333-4333-8333-333333333333";
const ownerAccountIdentifier = "44444444-4444-4444-8444-444444444444";

const adminDictionary = {
  accountCategoryLabels: {
    agency: "事務所",
    general: "一般",
    talent: "タレント",
  },
  allOfficialCertificationsLoaded: "すべての公式認証申請を読み込みました。",
  loadMoreOfficialCertifications: "さらに読み込む",
  officialCertificationApprove: "承認",
  officialCertificationApproveFailed: "公式認証を承認できませんでした。",
  officialCertificationListEmptyMessage: "レビュー待ちの申請が届くとここに表示されます。",
  officialCertificationListEmptyTitle: "未承認の公式認証申請はありません",
  officialCertificationListLoadFailed: "公式認証申請一覧を読み込めませんでした。",
  officialCertificationListLoading: "公式認証申請を読み込んでいます。",
  officialCertificationListLoadingMore: "さらに読み込み中",
  officialCertificationListTotal: (total: number) => `未承認申請 ${total} 件`,
  officialCertificationOwnerAccountCategoryLabel: "申請アカウントカテゴリ",
  officialCertificationOwnerAccountEmailLabel: "申請アカウントメールアドレス",
  officialCertificationOwnerAccountLabel: "申請アカウント",
  officialCertificationOwnerAccountNameLabel: "申請アカウント名",
  officialCertificationReject: "拒否",
  officialCertificationRejectFailed: "公式認証を拒否できませんでした。",
  officialCertificationRejectSucceeded: "公式認証を拒否しました。",
  officialCertificationRequestedAtLabel: "申請日時",
  officialCertificationResourceTypeLabel: "リソース種別",
  officialCertificationApproveSucceeded: "公式認証を承認しました。",
  officialCertificationReviewDescription: "未承認の公式認証申請を一覧から確認し、申請ごとに承認または拒否します。",
  officialCertificationReviewFailed: "公式認証を更新できませんでした。",
  officialCertificationReviewSucceeded: (status: string) => `公式認証を更新しました。状態: ${status}`,
  officialCertificationReviewTitle: "未承認の公式認証",
  officialCertificationReviewing: "処理中",
  officialCertificationStatusLabel: "状態",
  officialCertificationTranslationSetLabel: "Translation set",
  officialCertificationUnknownOwner: "申請アカウント不明",
  officialCertificationWikiLabel: "Wiki",
  reloadOfficialCertifications: "再読み込み",
};

vi.mock("../../../AdminProvider", () => ({
  useAdmin: () => ({
    currentIdentity: {
      identityIdentifier: "55555555-5555-4555-8555-555555555555",
    },
    locale: "ja",
    t: adminDictionary,
  }),
}));

vi.mock("../../WikiSectionProvider", () => ({
  useWikiSection: () => ({
    officialCertificationAdapter: {
      listOfficialCertifications,
      reviewOfficialCertification,
    },
  }),
}));

const createCertification = () => ({
  approvedAt: null,
  certificationIdentifier,
  ownerAccount: {
    accountIdentifier: ownerAccountIdentifier,
    category: "agency",
    email: "owner@example.test",
    name: "Owner Agency",
    status: "active",
    type: "organization",
  },
  rejectedAt: null,
  requestedAt: "2026-08-23T01:02:03+00:00",
  resourceType: "agency",
  status: "pending",
  translationSetIdentifier,
  wikis: [
    {
      fontStyle: null,
      imageAltText: null,
      imageIdentifier: null,
      imageUrl: null,
      isHidden: false,
      keywords: null,
      language: "ja",
      metaDescription: null,
      name: "レビュー対象 Wiki",
      normalizedName: "レビュー対象 wiki",
      publishedAt: null,
      resourceType: "agency",
      slug: "review-target",
      themeColor: null,
      title: null,
      translationSetIdentifier,
      updatedAt: null,
      version: 1,
      wikiIdentifier,
    },
    {
      fontStyle: null,
      imageAltText: null,
      imageIdentifier: null,
      imageUrl: null,
      isHidden: false,
      keywords: null,
      language: "en",
      metaDescription: null,
      name: "Review Target Wiki",
      normalizedName: "review target wiki",
      publishedAt: null,
      resourceType: "agency",
      slug: "review-target-en",
      themeColor: null,
      title: null,
      translationSetIdentifier,
      updatedAt: null,
      version: 1,
      wikiIdentifier: "66666666-6666-4666-8666-666666666666",
    },
  ],
});

const renderClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OfficialCertificationReviewClient />
    </QueryClientProvider>,
  );
};

describe("OfficialCertificationReviewClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    listOfficialCertifications.mockReset();
    reviewOfficialCertification.mockReset();
  });

  it("loads and displays pending official certification requests from the list", async () => {
    listOfficialCertifications.mockResolvedValue({
      current_page: 1,
      last_page: 1,
      officialCertifications: [createCertification()],
      per_page: 20,
      total: 1,
    });

    renderClient();

    expect(await screen.findByText("レビュー対象 Wiki")).toBeInTheDocument();
    const jaWikiLink = screen.getByRole("link", { name: "ja" });
    expect(jaWikiLink).toHaveAttribute("href", "/ja/wiki/review-target");
    expect(jaWikiLink).toHaveAttribute("target", "_blank");
    expect(jaWikiLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "en" })).toHaveAttribute(
      "href",
      "/en/wiki/review-target-en",
    );
    expect(screen.queryByText(certificationIdentifier)).not.toBeInTheDocument();
    expect(screen.queryByText(translationSetIdentifier)).not.toBeInTheDocument();
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
    expect(screen.getByText("Owner Agency")).toBeInTheDocument();
    expect(screen.getByText("事務所")).toBeInTheDocument();
    expect(screen.getByText("owner@example.test")).toBeInTheDocument();
    expect(screen.getByText("未承認申請 1 件")).toBeInTheDocument();
    expect(screen.queryByLabelText("Certification ID")).not.toBeInTheDocument();
    expect(listOfficialCertifications).toHaveBeenCalledWith({
      fallbackErrorMessage: "公式認証申請一覧を読み込めませんでした。",
      page: 1,
      perPage: 20,
      status: "pending",
    });
  });

  it("approves a listed certification and removes it from the pending list", async () => {
    listOfficialCertifications.mockResolvedValue({
      current_page: 1,
      last_page: 1,
      officialCertifications: [createCertification()],
      per_page: 20,
      total: 1,
    });
    reviewOfficialCertification.mockResolvedValue({
      certificationIdentifier,
      resourceType: "agency",
      status: "approved",
      translationSetIdentifier,
    });

    renderClient();

    const card = await screen.findByRole("article");
    fireEvent.click(within(card).getByRole("button", { name: "承認" }));

    await waitFor(() => {
      expect(reviewOfficialCertification).toHaveBeenCalledWith({
        action: "approve",
        fallbackErrorMessage: "公式認証を承認できませんでした。",
        requestBody: { certificationIdentifier },
      });
    });
    await waitFor(() => {
      expect(screen.queryByText("レビュー対象 Wiki")).not.toBeInTheDocument();
    });
    expect(screen.getByText("公式認証を承認しました。")).toBeInTheDocument();
    expect(screen.queryByText("公式認証を更新しました。状態: approved")).not.toBeInTheDocument();
  });

  it("rejects a listed certification through the existing review adapter", async () => {
    listOfficialCertifications.mockResolvedValue({
      current_page: 1,
      last_page: 1,
      officialCertifications: [createCertification()],
      per_page: 20,
      total: 1,
    });
    reviewOfficialCertification.mockResolvedValue({
      certificationIdentifier,
      resourceType: "agency",
      status: "rejected",
      translationSetIdentifier,
    });

    renderClient();

    const card = await screen.findByRole("article");
    fireEvent.click(within(card).getByRole("button", { name: "拒否" }));

    await waitFor(() => {
      expect(reviewOfficialCertification).toHaveBeenCalledWith({
        action: "reject",
        fallbackErrorMessage: "公式認証を拒否できませんでした。",
        requestBody: { certificationIdentifier },
      });
    });
    expect(await screen.findByText("公式認証を拒否しました。")).toBeInTheDocument();
  });

  it("shows a reload action when listing requests fails", async () => {
    listOfficialCertifications
      .mockRejectedValueOnce(new Error("公式認証申請一覧を読み込めませんでした。"))
      .mockResolvedValueOnce({
        current_page: 1,
        last_page: 1,
        officialCertifications: [createCertification()],
        per_page: 20,
        total: 1,
      });

    renderClient();

    expect(await screen.findByRole("alert")).toHaveTextContent("公式認証申請一覧を読み込めませんでした。");
    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(await screen.findByText("レビュー対象 Wiki")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ja" })).toHaveAttribute("href", "/ja/wiki/review-target");
  });
});
