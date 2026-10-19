import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../i18n/dictionaries";
import { AccountLayoutClient } from "./AccountLayoutClient";

const navigationMocks = vi.hoisted(() => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("next/navigation", () => ({ redirect: navigationMocks.redirect }));

const identity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountId: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "44444444-4444-4444-8444-444444444444",
  accountPrincipalStatus: "active" as const,
  siteManagementPrincipalStatus: "active" as const,
  accountEffectivePolicies: [{ statements: [{ effect: "allow", actions: ["account:delegation-request:create"], resourceTypes: ["ACCOUNT"] }] }],
};

const renderLayout = (activeTab: "accountProfile" | "accountDelegations" | "accountNotifications", currentIdentity = identity) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AccountLayoutClient activeTab={activeTab} currentIdentity={currentIdentity} onAuthorizationRejected={vi.fn()} t={dictionaries.ja.admin}><div>delegation page</div></AccountLayoutClient></QueryClientProvider>);
};

describe("AccountLayoutClient delegation access", () => {
  it("places notifications between documents and category and uses dedicated read access", () => {
    const user = { ...identity, accountEffectivePolicies: [{ statements: [{ effect: "allow", actions: ["account:notification-settings:read"], resourceTypes: ["ACCOUNT"] }] }] };
    renderLayout("accountNotifications", user);
    const tabs = screen.getAllByRole("tab").map(tab => tab.textContent);
    expect(tabs.indexOf("通知設定")).toBe(tabs.indexOf("書類アップロード") + 1);
    expect(tabs.indexOf("カテゴリ変更")).toBe(tabs.indexOf("通知設定") + 1);
    expect(screen.getByText("delegation page")).toBeInTheDocument();
  });
  it("rejects direct notification access with only general account permission", async () => {
    expect(() => renderLayout("accountNotifications", { ...identity, accountEffectivePolicies: [{ statements: [{ effect: "allow", actions: ["account:update"], resourceTypes: ["ACCOUNT"] }] }] })).toThrow("redirect:/admin/account/profile");
    expect(navigationMocks.redirect).toHaveBeenCalledWith("/admin/account/profile");
    expect(screen.queryByRole("tab", { name: "通知設定" })).not.toBeInTheDocument();
    expect(screen.queryByText("delegation page")).not.toBeInTheDocument();
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); navigationMocks.redirect.mockClear(); });

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
    expect(() => renderLayout("accountDelegations", unrelatedIdentity)).toThrow("redirect:/admin/account/profile");
    expect(navigationMocks.redirect).toHaveBeenCalledWith("/admin/account/profile");
    expect(screen.queryByText("delegation page")).not.toBeInTheDocument();
  });
});
