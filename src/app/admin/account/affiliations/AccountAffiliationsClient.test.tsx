import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { dictionaries } from "../../../../i18n/dictionaries";
import { AccountSectionProvider } from "../AccountSectionContext";
import { AccountAffiliationsClient } from "./AccountAffiliationsClient";

const renderClient = (overrides: Partial<Parameters<typeof AccountSectionProvider>[0]["value"]> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
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
      </AccountSectionProvider>
    </QueryClientProvider>,
  );
};

const affiliation: AffiliationSummary = {
  affiliationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  agencyAccountIdentifier: "22222222-2222-4222-8222-222222222222",
  talentAccountIdentifier: "33333333-3333-4333-8333-333333333333",
  agencyAccount: {
    accountIdentifier: "22222222-2222-4222-8222-222222222222",
    name: "Agency Account",
    email: "agency@example.com",
  },
  talentAccount: {
    accountIdentifier: "33333333-3333-4333-8333-333333333333",
    name: "Talent Account",
    email: "talent@example.com",
  },
  requestedBy: "44444444-4444-4444-8444-444444444444",
  status: "pending",
  terms: null,
  requestedAt: "2026-08-11T00:00:00Z",
  activatedAt: null,
  terminatedAt: null,
};

const affiliationList = (items: AffiliationSummary[] = [affiliation]) => ({
  affiliations: items,
  current_page: 1,
  last_page: 1,
  total: items.length,
  per_page: 50,
});

describe("AccountAffiliationsClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("submits affiliation requests from a target email only", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve(new Response(JSON.stringify(affiliation), { status: 201 }));
      return Promise.resolve(new Response(JSON.stringify(affiliationList([])), { status: 200 }));
    });
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

  it("shows review actions in pending request cards by policy", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(affiliationList([])), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    renderClient({ canRequestAffiliation: false, canRejectAffiliations: false });

    expect(screen.queryByLabelText("対象アカウントのメールアドレス")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "未承認の申請" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "申請の承認・拒否" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拒否" })).not.toBeInTheDocument();
  });

  it("shows pending requests and active affiliations from the list API", async () => {
    const activeAffiliation = { ...affiliation, affiliationIdentifier: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "active", activatedAt: "2026-08-12T00:00:00Z" };
    const requestedPendingAffiliation = { ...affiliation, affiliationIdentifier: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("status=pending") && url.includes("viewerRole=requester")) return Promise.resolve(new Response(JSON.stringify(affiliationList([requestedPendingAffiliation])), { status: 200 }));
      if (url.includes("status=pending") && url.includes("viewerRole=approver")) return Promise.resolve(new Response(JSON.stringify(affiliationList([affiliation])), { status: 200 }));
      if (url.includes("status=active")) return Promise.resolve(new Response(JSON.stringify(affiliationList([activeAffiliation])), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(affiliation), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderClient();

    expect(screen.getByRole("tablist", { name: "アフィリエーション管理タブ" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "申請" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "申請中" }));
    expect(await screen.findByRole("heading", { name: "申請中のリクエスト" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "申請中" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "承認待ち" }));
    expect(await screen.findByRole("heading", { name: "未承認の申請" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Agency Account").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Talent Account").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "承認" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒否" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "成立済み" }));
    expect(screen.getByRole("heading", { name: "アフィリエーション済みのアカウント" })).toBeInTheDocument();
    expect(screen.queryByText("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/account/affiliations?status=pending&viewerRole=requester", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/account/affiliations?status=pending&viewerRole=approver", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/account/affiliations?status=active", expect.objectContaining({ method: "GET" }));
  });

});
