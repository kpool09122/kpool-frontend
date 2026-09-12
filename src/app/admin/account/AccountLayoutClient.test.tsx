import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../i18n/dictionaries";
import { AccountLayoutClient } from "./AccountLayoutClient";

const navigationMocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: navigationMocks.replace }) }));

const accountIdentifier = "22222222-2222-4222-8222-222222222222";
const identity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountId: accountIdentifier,
  accountPrincipalIdentifier: "44444444-4444-4444-8444-444444444444",
  accountEffectivePolicies: [{
    statements: [{ effect: "allow", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] }],
  }],
};
const activeAffiliation = {
  affiliationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  agencyAccountIdentifier: accountIdentifier,
  talentAccountIdentifier: "33333333-3333-4333-8333-333333333333",
  agencyAccount: { accountIdentifier, name: "Agency", email: "agency@example.com" },
  talentAccount: { accountIdentifier: "33333333-3333-4333-8333-333333333333", name: "Talent", email: "talent@example.com" },
  requestedBy: accountIdentifier,
  status: "active",
  terms: null,
  requestedAt: "2026-09-11T00:00:00Z",
  activatedAt: "2026-09-12T00:00:00Z",
  terminatedAt: null,
};
const listResponse = (affiliations: typeof activeAffiliation[]) => ({ affiliations, current_page: 1, last_page: 1, total: affiliations.length, per_page: 50 });

const renderLayout = (activeTab: "accountProfile" | "accountDelegations", currentIdentity = identity) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountLayoutClient
        activeTab={activeTab}
        currentIdentity={currentIdentity}
        onAuthorizationRejected={vi.fn()}
        t={dictionaries.ja.admin}
      >
        <div>delegation page</div>
      </AccountLayoutClient>
    </QueryClientProvider>,
  );
};

describe("AccountLayoutClient delegation access", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    navigationMocks.replace.mockReset();
  });

  it("shows the tab only when effective allow and an active affiliation both exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(listResponse([activeAffiliation])), { status: 200 })));
    renderLayout("accountProfile");

    expect(await screen.findByRole("tab", { name: "デレゲーション管理" })).toBeInTheDocument();
  });

  it("hides the tab when an explicit deny overrides allow", () => {
    const deniedIdentity = {
      ...identity,
      accountEffectivePolicies: [{ statements: [
        { effect: "allow", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] },
        { effect: "deny", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] },
      ] }],
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderLayout("accountProfile", deniedIdentity);

    expect(screen.queryByRole("tab", { name: "デレゲーション管理" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps a direct navigation visible when active affiliation loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "failed" }), { status: 502 })));
    renderLayout("accountDelegations");

    await waitFor(() => expect(screen.getByText("delegation page")).toBeInTheDocument());
    expect(navigationMocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("tab", { name: "デレゲーション管理" })).not.toBeInTheDocument();
  });

  it("does not redirect a direct navigation until affiliation loading finishes", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    })));
    renderLayout("accountDelegations");

    expect(screen.getByText("delegation page")).toBeInTheDocument();
    expect(navigationMocks.replace).not.toHaveBeenCalled();

    resolveResponse(new Response(JSON.stringify(listResponse([])), { status: 200 }));
    await waitFor(() => expect(navigationMocks.replace).toHaveBeenCalledWith("/admin/account/profile"));
  });
});
