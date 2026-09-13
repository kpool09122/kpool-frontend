import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { dictionaries } from "../../../../i18n/dictionaries";
import { AccountSectionProvider } from "../AccountSectionContext";
import { AccountDelegationsClient } from "./AccountDelegationsClient";
import { getDelegationTargetAccount } from "./useAccountDelegations";

const agencyId = "22222222-2222-4222-8222-222222222222";
const talentId = "33333333-3333-4333-8333-333333333333";
const affiliation: AffiliationSummary = {
  affiliationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", agencyAccountIdentifier: agencyId, talentAccountIdentifier: talentId,
  agencyAccount: { accountIdentifier: agencyId, name: "Agency Account", email: "agency@example.com" },
  talentAccount: { accountIdentifier: talentId, name: "Talent Account", email: "talent@example.com" },
  requestedBy: agencyId, status: "active", terms: null, requestedAt: "2026-09-11T00:00:00Z", activatedAt: "2026-09-12T00:00:00Z", terminatedAt: null,
};
const delegation = {
  delegationIdentifier: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", affiliationIdentifier: affiliation.affiliationIdentifier,
  delegateAccountIdentifier: agencyId, delegatorAccountIdentifier: talentId, requestedByAccountIdentifier: agencyId,
  delegateAccount: { accountIdentifier: agencyId, name: "Agency Account", email: "agency@example.com" },
  delegatorAccount: { accountIdentifier: talentId, name: "Talent Account", email: "talent@example.com" },
  requestedByAccount: { accountIdentifier: agencyId, name: "Agency Account", email: "agency@example.com" },
  status: "pending", direction: "agency_to_talent", requestedAt: "2026-09-12T00:00:00Z", approvedAt: null, rejectedAt: null,
};
const page = <T,>(key: string, items: T[]) => ({ [key]: items, current_page: 1, last_page: 1, total: items.length, per_page: 50 });

const renderClient = (permissions: { request?: boolean; approve?: boolean; reject?: boolean } = { request: true, approve: true, reject: true }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AccountSectionProvider value={{
    accountIdentifier: agencyId, accountPrincipalIdentifier: "44444444-4444-4444-8444-444444444444",
    canApproveAffiliations: false, canApproveDelegations: permissions.approve ?? false, canEdit: false, canInvite: false,
    canManageCategoryChangeRequests: false, canManagePrincipalGroups: false, canReceiveAffiliationRequests: false,
    canRejectAffiliations: false, canRejectDelegations: permissions.reject ?? false, canRequestAffiliation: false,
    canRequestDelegation: permissions.request ?? false, onAuthorizationRejected: vi.fn(), t: dictionaries.ja.admin,
  }}><AccountDelegationsClient /></AccountSectionProvider></QueryClientProvider>);
};

const installFetch = (reviewStatus = 200) => {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === "/api/account/affiliations?status=active") return Promise.resolve(new Response(JSON.stringify(page("affiliations", [affiliation])), { status: 200 }));
    if (url.includes("/approve")) return Promise.resolve(new Response(JSON.stringify(reviewStatus === 200 ? { ...delegation, status: "approved", approvedAt: "2026-09-13T00:00:00Z" } : { message: "承認エラー" }), { status: reviewStatus }));
    if (url.includes("/reject")) return Promise.resolve(reviewStatus === 204 ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ message: "拒否エラー" }), { status: reviewStatus }));
    if (init?.method === "POST") return Promise.resolve(new Response(JSON.stringify(delegation), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify(page("delegations", [delegation])), { status: 200 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("AccountDelegationsClient", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("selects the opposite affiliated account", () => {
    expect(getDelegationTargetAccount(affiliation, agencyId)).toEqual(affiliation.talentAccount);
    expect(getDelegationTargetAccount(affiliation, talentId)).toEqual(affiliation.agencyAccount);
  });

  it("shows all four tabs and the requester, approver, and approved lists", async () => {
    installFetch(); renderClient();
    expect(await screen.findByRole("tab", { name: "申請" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "申請中" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "未承認" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "成立済み" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "申請中" }));
    await waitFor(() => expect(screen.getAllByText("Agency Account").length).toBeGreaterThan(0));
    expect(screen.queryByText("agency_to_talent")).not.toBeInTheDocument();
    expect(screen.queryByText("申請者アカウント")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "未承認" }));
    expect(await screen.findByRole("button", { name: "承認" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒否" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "成立済み" }));
    expect(await screen.findByText("Talent Account")).toBeInTheDocument();
    expect(screen.getByText("talent@example.com")).toBeInTheDocument();
    expect(screen.queryByText(talentId)).not.toBeInTheDocument();
  });

  it("submits approval and refreshes all three delegation lists", async () => {
    const fetchMock = installFetch(); renderClient();
    fireEvent.click(await screen.findByRole("tab", { name: "未承認" }));
    fireEvent.click(await screen.findByRole("button", { name: "承認" }));
    expect(await screen.findByText("デレゲーション申請を承認しました。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/account/delegations/${delegation.delegationIdentifier}/approve`, expect.objectContaining({ method: "POST", credentials: "include" }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/account/delegations?")).length).toBeGreaterThan(3));
  });

  it("submits rejection and displays route errors", async () => {
    const fetchMock = installFetch(422); renderClient();
    fireEvent.click(await screen.findByRole("tab", { name: "未承認" }));
    fireEvent.click(await screen.findByRole("button", { name: "拒否" }));
    expect(await screen.findByText("拒否エラー")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/account/delegations/${delegation.delegationIdentifier}/reject`, expect.objectContaining({ method: "POST" }));
  });

  it("hides review actions without approve or reject permission", async () => {
    installFetch(); renderClient({ request: true });
    expect(await screen.findByRole("tab", { name: "成立済み" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "未承認" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拒否" })).not.toBeInTheDocument();
  });
});
