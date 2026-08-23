import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfficialCertificationRequestClient } from "./OfficialCertificationRequestClient";

const listMyOfficialCertifications = vi.fn();
const listMyOwnedWikis = vi.fn();
const requestOfficialCertification = vi.fn();
const syncOwnedWikiCertifications = vi.fn();

const adminDictionary = {
  officialCertificationRequestTitle: "公式認証管理",
  officialCertificationRequestDescription: "現在の公式認証状態を確認し、必要に応じて公式認証を申請・同期できます。",
  officialCertificationGeneralAccountMessage: "general アカウントでは公式認証を申請できません。",
  officialCertificationWikiSearchLabel: "Wiki",
  officialCertificationWikiSearchPlaceholder: "公式認証を申請する Wiki 名で検索",
  officialCertificationSubmit: "公式認証を申請",
  officialCertificationSubmitting: "申請中",
  officialCertificationRequestSucceeded: (status: string) => `公式認証を申請しました。状態: ${status}`,
  officialCertificationRequestFailed: "公式認証を申請できませんでした。",
  officialCertificationRequestUnavailable: "公式認証申請に必要なアカウント情報または Wiki を確認してください。",
  officialCertificationManagementLoading: "公式認証状態を読み込んでいます。",
  officialCertificationMyListLoadFailed: "現在の公式認証状態を読み込めませんでした。",
  officialCertificationOwnedWikisLoadFailed: "所有Wikiを読み込めませんでした。",
  officialCertificationPendingTitle: "公式認証は申請中です",
  officialCertificationPendingDescription: "運営者の承認が完了するまで、再申請はできません。",
  officialCertificationApprovedPrimaryTitle: "Primary 公式Wiki",
  officialCertificationApprovedPrimaryDescription: "このアカウントは primary 公式Wiki として承認済みです。",
  officialCertificationAdditionalTitle: "追加公式認証",
  officialCertificationAdditionalDescription: "所有している group / song Wiki を公式認証として同期します。既存の承認済み公式認証も含めて送信します。",
  officialCertificationAdditionalEmpty: "同期できる追加候補はありません。",
  officialCertificationOwnedWikisSync: "追加公式認証を同期",
  officialCertificationOwnedWikisSyncing: "同期中",
  officialCertificationOwnedWikisSyncSucceeded: (count: number) => `公式認証を同期しました。対象: ${count} 件`,
  officialCertificationOwnedWikisSyncFailed: "追加公式認証を同期できませんでした。",
  officialCertificationSearch: "検索",
  officialCertificationSearching: "検索中",
  officialCertificationSearchLoading: "Wiki候補を検索しています",
  officialCertificationSearchEmpty: "候補が見つかりません",
  officialCertificationSearchKeywordRequired: "検索キーワードを入力してください",
  officialCertificationSearchFailed: "Wiki候補の検索に失敗しました",
};

vi.mock("../../../AdminProvider", () => ({
  useAdmin: () => ({
    currentIdentity: {
      identityIdentifier: "55555555-5555-4555-8555-555555555555",
      account: {
        accountIdentifier: "44444444-4444-4444-8444-444444444444",
        accountCategory: "agency",
      },
    },
    locale: "en",
    t: adminDictionary,
  }),
}));

vi.mock("../../WikiSectionProvider", () => ({
  useWikiSection: () => ({
    officialCertificationAdapter: {
      listMyOfficialCertifications,
      listMyOwnedWikis,
      requestOfficialCertification,
      syncOwnedWikiCertifications,
    },
  }),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const emptyCertificationList = () => ({
  officialCertifications: [],
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 100,
});

const emptyOwnedWikis = () => ({
  accountCategory: "agency",
  primaryOwnedWikis: [],
  otherOwnedWikis: [],
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 100,
});

const renderClient = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <OfficialCertificationRequestClient />
    </QueryClientProvider>,
  );
};

describe("OfficialCertificationRequestClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    listMyOfficialCertifications.mockReset();
    listMyOwnedWikis.mockReset();
    requestOfficialCertification.mockReset();
    syncOwnedWikiCertifications.mockReset();
  });

  it("searches agency translation sets, displays the UI locale wiki, and submits translationSetIdentifier", async () => {
    listMyOfficialCertifications.mockResolvedValue(emptyCertificationList());
    listMyOwnedWikis.mockResolvedValue(emptyOwnedWikis());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          translationSetMasters: [
            {
              translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
              resourceType: "agency",
              wikis: [
                {
                  wikiIdentifier: "22222222-2222-4222-8222-222222222222",
                  language: "ja",
                  name: "日本語名",
                  slug: "ja-name",
                },
                {
                  wikiIdentifier: "33333333-3333-4333-8333-333333333333",
                  language: "en",
                  name: "English Name",
                  slug: "en-name",
                },
              ],
            },
          ],
        }),
      ),
    );
    requestOfficialCertification.mockResolvedValue({ status: "requested" });

    renderClient();

    await screen.findByRole("button", { name: "公式認証を申請" });
    fireEvent.change(screen.getByLabelText("Wiki keyword"), {
      target: { value: "twice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    fireEvent.click(await screen.findByRole("button", { name: /English Name/ }));
    fireEvent.click(screen.getByRole("button", { name: "公式認証を申請" }));

    await waitFor(() => {
      expect(requestOfficialCertification).toHaveBeenCalledWith({
        fallbackErrorMessage: "公式認証を申請できませんでした。",
        requestBody: {
          resourceType: "agency",
          translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
        },
      });
    });
    expect(JSON.stringify(requestOfficialCertification.mock.calls)).not.toContain("wikiId");
    expect(JSON.stringify(requestOfficialCertification.mock.calls)).not.toContain("ownerAccountId");
  });

  it("shows pending requests as a status card instead of the request form", async () => {
    listMyOfficialCertifications.mockImplementation(({ status }: { status?: string }) => Promise.resolve({
      ...emptyCertificationList(),
      officialCertifications: status === "pending" ? [{
        certificationIdentifier: "11111111-1111-4111-8111-111111111111",
        resourceType: "agency",
        translationSetIdentifier: "22222222-2222-4222-8222-222222222222",
        ownerAccount: null,
        wikis: [{
          wikiIdentifier: "33333333-3333-4333-8333-333333333333",
          translationSetIdentifier: "22222222-2222-4222-8222-222222222222",
          resourceType: "agency",
          language: "ja",
          name: "申請中Wiki",
          slug: "pending-wiki",
          normalizedName: "申請中wiki",
          metaDescription: null,
          keywords: null,
          imageIdentifier: null,
          imageUrl: null,
          imageAltText: null,
          isHidden: false,
          publishedAt: null,
          updatedAt: null,
        }],
        status: "pending",
        requestedAt: "2026-08-23T01:02:03+00:00",
        approvedAt: null,
        rejectedAt: null,
      }] : [],
    }));
    listMyOwnedWikis.mockResolvedValue(emptyOwnedWikis());

    renderClient();

    expect(await screen.findByText("公式認証は申請中です")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "公式認証を申請" })).not.toBeInTheDocument();
  });

  it("syncs selected additional certifications with existing approved translation sets", async () => {
    listMyOfficialCertifications.mockImplementation(({ status }: { status?: string }) => Promise.resolve({
      ...emptyCertificationList(),
      officialCertifications: status === "approved" ? [{
        certificationIdentifier: "11111111-1111-4111-8111-111111111111",
        resourceType: "agency",
        translationSetIdentifier: "22222222-2222-4222-8222-222222222222",
        ownerAccount: null,
        wikis: [{
          wikiIdentifier: "33333333-3333-4333-8333-333333333333",
          translationSetIdentifier: "22222222-2222-4222-8222-222222222222",
          resourceType: "agency",
          language: "ja",
          name: "Primary Wiki",
          slug: "primary-wiki",
          normalizedName: "primary wiki",
          metaDescription: null,
          keywords: null,
          imageIdentifier: null,
          imageUrl: null,
          imageAltText: null,
          isHidden: false,
          publishedAt: null,
          updatedAt: null,
        }],
        status: "approved",
        requestedAt: "2026-08-23T01:02:03+00:00",
        approvedAt: "2026-08-23T02:02:03+00:00",
        rejectedAt: null,
      }] : [],
    }));
    listMyOwnedWikis.mockResolvedValue({
      ...emptyOwnedWikis(),
      otherOwnedWikis: [{
        wikiIdentifier: "44444444-4444-4444-8444-444444444444",
        translationSetIdentifier: "55555555-5555-4555-8555-555555555555",
        resourceType: "group",
        language: "ja",
        name: "追加Group",
        slug: "extra-group",
        normalizedName: "追加group",
        metaDescription: null,
        keywords: null,
        imageIdentifier: null,
        imageUrl: null,
        imageAltText: null,
        isHidden: false,
        publishedAt: null,
        updatedAt: null,
      }],
    });
    syncOwnedWikiCertifications.mockResolvedValue({ approved: [], rejected: [], unchanged: [] });

    renderClient();

    fireEvent.click(await screen.findByLabelText(/追加Group/));
    fireEvent.click(screen.getByRole("button", { name: "追加公式認証を同期" }));

    await waitFor(() => {
      expect(syncOwnedWikiCertifications).toHaveBeenCalledWith({
        fallbackErrorMessage: "追加公式認証を同期できませんでした。",
        requestBody: {
          translationSetIdentifiers: [
            "22222222-2222-4222-8222-222222222222",
            "55555555-5555-4555-8555-555555555555",
          ],
        },
      });
    });
  });

  it("shows request failures as a red bordered alert", async () => {
    listMyOfficialCertifications.mockResolvedValue(emptyCertificationList());
    listMyOwnedWikis.mockResolvedValue(emptyOwnedWikis());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          translationSetMasters: [
            {
              translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
              resourceType: "agency",
              wikis: [
                {
                  wikiIdentifier: "33333333-3333-4333-8333-333333333333",
                  language: "en",
                  name: "English Name",
                  slug: "en-name",
                },
              ],
            },
          ],
        }),
      ),
    );
    requestOfficialCertification.mockRejectedValue(
      new Error("Official certification is temporarily unavailable. Please try again later."),
    );

    renderClient();

    await screen.findByRole("button", { name: "公式認証を申請" });
    fireEvent.change(screen.getByLabelText("Wiki keyword"), {
      target: { value: "twice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    fireEvent.click(await screen.findByRole("button", { name: /English Name/ }));
    fireEvent.click(screen.getByRole("button", { name: "公式認証を申請" }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Official certification is temporarily unavailable. Please try again later.");
    expect(alert).toHaveClass("border-red-300", "bg-red-50", "text-red-800");
  });
});
