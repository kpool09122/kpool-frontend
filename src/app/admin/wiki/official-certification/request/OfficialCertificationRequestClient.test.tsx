import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfficialCertificationRequestClient } from "./OfficialCertificationRequestClient";

const requestOfficialCertification = vi.fn();

const adminDictionary = {
  officialCertificationRequestTitle: "公式認証申請",
  officialCertificationRequestDescription: "公式認証を申請する Wiki を検索して選択してください。",
  officialCertificationGeneralAccountMessage: "general アカウントでは公式認証を申請できません。",
  officialCertificationWikiSearchLabel: "Wiki",
  officialCertificationWikiSearchPlaceholder: "公式認証を申請する Wiki 名で検索",
  officialCertificationSubmit: "公式認証を申請",
  officialCertificationSubmitting: "申請中",
  officialCertificationRequestSucceeded: (status: string) => `公式認証を申請しました。状態: ${status}`,
  officialCertificationRequestFailed: "公式認証を申請できませんでした。",
  officialCertificationRequestUnavailable: "公式認証申請に必要なアカウント情報または Wiki を確認してください。",
};

vi.mock("../../../AdminProvider", () => ({
  useAdmin: () => ({
    currentIdentity: {
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
    officialCertificationAdapter: { requestOfficialCertification },
  }),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("OfficialCertificationRequestClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    requestOfficialCertification.mockReset();
  });

  it("searches agency translation sets, displays the UI locale wiki, and submits translationSetIdentifier", async () => {
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

    render(<OfficialCertificationRequestClient />);

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
});
