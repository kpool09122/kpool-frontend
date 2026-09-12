import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { dictionaries } from "../../../../i18n/dictionaries";
import { AccountSectionProvider } from "../AccountSectionContext";
import { AccountDelegationsClient } from "./AccountDelegationsClient";
import { getDelegationTargetAccount } from "./useAccountDelegations";

const agencyAccountIdentifier = "22222222-2222-4222-8222-222222222222";
const talentAccountIdentifier = "33333333-3333-4333-8333-333333333333";
const affiliation: AffiliationSummary = {
  affiliationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  agencyAccountIdentifier,
  talentAccountIdentifier,
  agencyAccount: { accountIdentifier: agencyAccountIdentifier, name: "Agency Account", email: "agency@example.com" },
  talentAccount: { accountIdentifier: talentAccountIdentifier, name: "Talent Account", email: "talent@example.com" },
  requestedBy: agencyAccountIdentifier,
  status: "active",
  terms: null,
  requestedAt: "2026-09-11T00:00:00Z",
  activatedAt: "2026-09-12T00:00:00Z",
  terminatedAt: null,
};
const listResponse = { affiliations: [affiliation], current_page: 1, last_page: 1, total: 1, per_page: 50 };
const delegationResponse = {
  delegationIdentifier: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  affiliationIdentifier: affiliation.affiliationIdentifier,
  delegateAccountIdentifier: agencyAccountIdentifier,
  delegatorAccountIdentifier: talentAccountIdentifier,
  requestedByAccountIdentifier: agencyAccountIdentifier,
  status: "pending",
  direction: "agency_to_talent",
  requestedAt: "2026-09-12T00:00:00Z",
  approvedAt: null,
  rejectedAt: null,
};

const renderClient = (accountIdentifier = agencyAccountIdentifier) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountSectionProvider value={{
        accountIdentifier,
        accountPrincipalIdentifier: "44444444-4444-4444-8444-444444444444",
        canApproveAffiliations: false,
        canEdit: false,
        canInvite: false,
        canManageCategoryChangeRequests: false,
        canManagePrincipalGroups: false,
        canReceiveAffiliationRequests: false,
        canRejectAffiliations: false,
        canRequestAffiliation: false,
        canRequestDelegation: true,
        onAuthorizationRejected: vi.fn(),
        t: dictionaries.ja.admin,
      }}>
        <AccountDelegationsClient />
      </AccountSectionProvider>
    </QueryClientProvider>,
  );
};

describe("AccountDelegationsClient", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("selects the opposite account for both agency and talent viewers", () => {
    expect(getDelegationTargetAccount(affiliation, agencyAccountIdentifier)).toEqual(affiliation.talentAccount);
    expect(getDelegationTargetAccount(affiliation, talentAccountIdentifier)).toEqual(affiliation.agencyAccount);
    expect(getDelegationTargetAccount(affiliation, "55555555-5555-4555-8555-555555555555")).toBeNull();
  });

  it("lists active affiliations and submits only the selected target account identifier", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve(new Response(JSON.stringify(delegationResponse), { status: 201 }));
      return Promise.resolve(new Response(JSON.stringify(listResponse), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderClient();

    expect(await screen.findByText("Talent Account")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "デレゲーションを申請" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/account/delegations", expect.objectContaining({
      body: JSON.stringify({ targetAccountIdentifier: talentAccountIdentifier }),
      credentials: "include",
      method: "POST",
    })));
    expect(await screen.findByText("デレゲーション申請を送信しました。")).toBeInTheDocument();
  });

  it("keeps each affiliation card independently actionable while another request is pending", async () => {
    const secondTalentIdentifier = "55555555-5555-4555-8555-555555555555";
    const secondAffiliation = {
      ...affiliation,
      affiliationIdentifier: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      talentAccountIdentifier: secondTalentIdentifier,
      talentAccount: { accountIdentifier: secondTalentIdentifier, name: "Second Talent", email: "second@example.com" },
    };
    let resolveFirstRequest!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method !== "POST") {
        return Promise.resolve(new Response(JSON.stringify({ ...listResponse, affiliations: [affiliation, secondAffiliation], total: 2 }), { status: 200 }));
      }

      const body = JSON.parse(String(init.body)) as { targetAccountIdentifier: string };
      if (body.targetAccountIdentifier === talentAccountIdentifier) {
        return new Promise<Response>((resolve) => {
          resolveFirstRequest = resolve;
        });
      }

      return Promise.resolve(new Response(JSON.stringify({
        ...delegationResponse,
        affiliationIdentifier: secondAffiliation.affiliationIdentifier,
        delegatorAccountIdentifier: secondTalentIdentifier,
      }), { status: 201 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderClient();

    const buttons = await screen.findAllByRole("button", { name: "デレゲーションを申請" });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByRole("button", { name: "申請中" })).toBeDisabled());
    expect(buttons[1]).toBeEnabled();

    fireEvent.click(buttons[1]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/account/delegations", expect.objectContaining({
      body: JSON.stringify({ targetAccountIdentifier: secondTalentIdentifier }),
    })));

    resolveFirstRequest(new Response(JSON.stringify(delegationResponse), { status: 201 }));
    await waitFor(() => expect(screen.getAllByText("デレゲーション申請を送信しました。")).toHaveLength(2));
  });

  it.each([
    [403, "デレゲーションを申請する権限がありません。"],
    [409, "このアカウントへのデレゲーションは、すでに申請中または成立済みです。"],
    [422, "デレゲーション申請に失敗しました。"],
  ])("shows a localized error for status %s", async (status, expectedMessage) => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => init?.method === "POST"
      ? Promise.resolve(new Response(JSON.stringify({ message: "backend detail" }), { status }))
      : Promise.resolve(new Response(JSON.stringify(listResponse), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    renderClient();

    fireEvent.click(await screen.findByRole("button", { name: "デレゲーションを申請" }));
    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
  });

  it("shows an empty state when no active affiliation is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...listResponse, affiliations: [], total: 0 }), { status: 200 })));
    renderClient();

    expect(await screen.findByText("申請に利用できる成立済みのアフィリエーションはありません。")).toBeInTheDocument();
  });
});
