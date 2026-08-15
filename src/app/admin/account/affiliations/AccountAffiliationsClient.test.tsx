import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../../i18n/dictionaries";
import { AccountSectionProvider } from "../AccountSectionContext";
import { AccountAffiliationsClient } from "./AccountAffiliationsClient";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("affiliationId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
}));

const renderClient = (overrides: Partial<Parameters<typeof AccountSectionProvider>[0]["value"]> = {}) =>
  render(
    <AccountSectionProvider
      value={{
        accountIdentifier: "22222222-2222-4222-8222-222222222222",
        accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
        canApproveAffiliations: true,
        canEdit: false,
        canInvite: false,
        canManageCategoryChangeRequests: false,
        canManagePrincipalGroups: false,
        canReceiveAffiliationRequests: true,
        canRejectAffiliations: true,
        canRequestAffiliation: true,
        onAuthorizationRejected: vi.fn(),
        t: dictionaries.ja.admin,
        ...overrides,
      }}
    >
      <AccountAffiliationsClient />
    </AccountSectionProvider>,
  );

describe("AccountAffiliationsClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("submits affiliation requests from a target email only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      affiliationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      agencyAccountIdentifier: "22222222-2222-4222-8222-222222222222",
      talentAccountIdentifier: "33333333-3333-4333-8333-333333333333",
      requestedBy: "44444444-4444-4444-8444-444444444444",
      status: "pending",
      terms: null,
      requestedAt: "2026-08-11T00:00:00Z",
      activatedAt: null,
      terminatedAt: null,
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    renderClient();

    fireEvent.change(screen.getByLabelText("対象アカウントのメールアドレス"), { target: { value: "talent@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "申請する" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/account/affiliations", expect.objectContaining({
      body: JSON.stringify({ targetEmail: "talent@example.com" }),
      method: "POST",
    })));
    expect(await screen.findByText("アフィリエーション申請を送信しました。")).toBeInTheDocument();
  });

  it("prefills the affiliation ID from the query and shows review actions by policy", () => {
    renderClient({ canRequestAffiliation: false, canRejectAffiliations: false });

    expect(screen.queryByLabelText("対象アカウントのメールアドレス")).not.toBeInTheDocument();
    expect(screen.getByLabelText("アフィリエーションID")).toHaveValue("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(screen.getByRole("button", { name: "承認" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拒否" })).not.toBeInTheDocument();
    expect(screen.getByText(/バックエンドにアフィリエーション一覧APIが未公開/)).toBeInTheDocument();
  });
});
