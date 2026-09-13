import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../i18n/dictionaries";
import { AccountLayoutClient } from "./AccountLayoutClient";

const navigationMocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: navigationMocks.replace }) }));

const identity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountId: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "44444444-4444-4444-8444-444444444444",
  accountEffectivePolicies: [{ statements: [{ effect: "allow", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] }] }],
};

const renderLayout = (activeTab: "accountProfile" | "accountDelegations", currentIdentity = identity) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AccountLayoutClient activeTab={activeTab} currentIdentity={currentIdentity} onAuthorizationRejected={vi.fn()} t={dictionaries.ja.admin}><div>delegation page</div></AccountLayoutClient></QueryClientProvider>);
};

describe("AccountLayoutClient delegation access", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); navigationMocks.replace.mockReset(); });

  it("shows the tab to users who can request delegation even without loading affiliations", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); renderLayout("accountProfile");
    expect(screen.getByRole("tab", { name: "デレゲーション管理" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the tab to delegation reviewers", () => {
    const reviewIdentity = { ...identity, accountEffectivePolicies: [{ statements: [{ effect: "allow", actions: ["account:delegation:approve"], resourceTypes: ["ACCOUNT"] }] }] };
    renderLayout("accountProfile", reviewIdentity);
    expect(screen.getByRole("tab", { name: "デレゲーション管理" })).toBeInTheDocument();
  });

  it("hides the tab when an explicit deny overrides allow", () => {
    const deniedIdentity = { ...identity, accountEffectivePolicies: [{ statements: [
      { effect: "allow", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] },
      { effect: "deny", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] },
    ] }] };
    renderLayout("accountProfile", deniedIdentity);
    expect(screen.queryByRole("tab", { name: "デレゲーション管理" })).not.toBeInTheDocument();
  });

  it("redirects direct navigation when no delegation permission exists", async () => {
    const unrelatedIdentity = { ...identity, accountEffectivePolicies: [{ statements: [{ effect: "allow", actions: ["account:update"], resourceTypes: ["ACCOUNT"] }] }] };
    renderLayout("accountDelegations", unrelatedIdentity);
    await waitFor(() => expect(navigationMocks.replace).toHaveBeenCalledWith("/admin/account/profile"));
    expect(screen.queryByText("delegation page")).not.toBeInTheDocument();
  });
});
