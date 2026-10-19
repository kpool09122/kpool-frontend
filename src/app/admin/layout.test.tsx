import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";

const mocks = vi.hoisted(() => ({ loadAdminIdentity: vi.fn(), loadAdminWikiPrincipalSnapshot: vi.fn(), pathname: "/admin/wiki/editing", replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./adminWikiPrincipal", () => ({ loadAdminWikiPrincipalSnapshot: mocks.loadAdminWikiPrincipalSnapshot }));
vi.mock("./adminIdentity", () => ({ loadAdminIdentity: mocks.loadAdminIdentity }));

import AdminLayout from "./layout";
import { useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "./queryKeys";
import type { WikiPrincipalSummary } from "@/gateways/wiki/wikiPrincipal";
const wikiState = (status: WikiPrincipalSummary["status"]) => ({ status: "available" as const, principal: { principalIdentifier: "wiki-user", identityIdentifier: "user", status, policies: [], accountPrincipalCount: 1, isDelegatedPrincipal: false } });
function PrincipalControls() {
  const client = useQueryClient();
  return <>{(["active", "suspended", "forced_stop"] as const).map((status) => <button key={status} onClick={() => client.setQueryData(adminQueryKeys.principal.current(identity.identityIdentifier, identity.accountIdentifier ?? null), wikiState(status))}>{status}</button>)}</>;
}

const identity: AuthenticatedIdentitySummary = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: null,
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  accountPrincipalStatus: "active" as const,
  siteManagementPrincipalStatus: "active" as const,
  accountType: "individual",
  accountPolicies: [],
  account: { status: "active", type: "individual" },
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
};

beforeEach(() => {
  mocks.pathname = "/admin/wiki/editing";
  mocks.replace.mockClear();
  mocks.refresh.mockClear();
  useAuthStore.setState({ identity: null, status: "loading" });
  mocks.loadAdminIdentity.mockResolvedValue(identity);
  mocks.loadAdminWikiPrincipalSnapshot.mockResolvedValue({ state: wikiState("active"), updatedAt: Date.now() });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminLayout", () => {
  it("preserves the shell while replacing page content", async () => {
    const { rerender } = render(await AdminLayout({ children: <div key="editing">編集中の内容</div> }));
    fireEvent.click(screen.getByRole("button", { name: "管理画面メニューを閉じる" }));
    rerender(await AdminLayout({ children: <div key="submitted">申請中の内容</div> }));
    expect(screen.getByRole("button", { name: "管理画面メニューを開く" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("申請中の内容")).toBeInTheDocument();
    expect(screen.queryByText("編集中の内容")).not.toBeInTheDocument();
  });

  it.each([
    ["pending", "アカウントの初期設定", false],
    ["suspended", "このアカウントは現在利用できません", true],
    ["unknown", "アカウント情報を確認できません", false],
  ])("blocks page content for %s accounts at the shared layout", async (status, heading, hasSidebar) => {
    mocks.loadAdminIdentity.mockResolvedValue({ ...identity, account: { ...identity.account, status } });
    render(await AdminLayout({ children: <div>保護された内容</div> }));
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("保護された内容")).not.toBeInTheDocument();
    expect(Boolean(screen.queryByRole("complementary", { name: "管理画面メニュー" }))).toBe(hasSidebar);
  });

  it("updates common permissions and account status after an identity refresh", async () => {
    render(await AdminLayout({ children: <div>保護された内容</div> }));
    expect(screen.queryByRole("link", { name: "アカウント設定" })).not.toBeInTheDocument();
    act(() => useAuthStore.setState({ identity: {
      ...identity,
      accountPolicies: [{ policyIdentifier: "policy-1", name: "ACCOUNT_ADMIN", isSystemPolicy: true, statements: [{ effect: "allow", actions: ["account:update"], resourceTypes: ["ACCOUNT"] }] }],
    }, status: "authenticated" }));
    expect(screen.getByRole("link", { name: "アカウント設定" })).toBeInTheDocument();
    act(() => useAuthStore.setState({ identity: { ...identity, account: { ...identity.account, status: "suspended" } } }));
    expect(screen.getByRole("heading", { name: "このアカウントは現在利用できません" })).toBeInTheDocument();
    expect(screen.queryByText("保護された内容")).not.toBeInTheDocument();
  });
});


it.each(["profile", "language", "security", "other"])("allows user %s settings for a suspended account", async (page) => {
  mocks.pathname = `/admin/user/${page}`;
  mocks.loadAdminIdentity.mockResolvedValue({ ...identity, account: { ...identity.account, status: "suspended" } });
  render(await AdminLayout({ children: <div>ユーザー設定の内容</div> }));
  expect(screen.getByText("ユーザー設定の内容")).toBeVisible();
  expect(screen.queryByText("このアカウントは現在利用できません")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ユーザー設定" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "Wiki" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "アカウント設定" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "サイト管理" })).not.toBeInTheDocument();
});


it.each(["pending", "unknown"])("keeps Identity settings independent of account status %s", async (status) => {
  mocks.pathname = "/admin/user/profile";
  mocks.loadAdminIdentity.mockResolvedValue({ ...identity, account: { ...identity.account, status } });
  render(await AdminLayout({ children: <div>ユーザー設定の内容</div> }));
  expect(screen.getByText("ユーザー設定の内容")).toBeVisible();
  expect(screen.queryByRole("link", { name: "Wiki" })).not.toBeInTheDocument();
});


it.each(["suspended", "forced_stop"] as const)("redirects to user settings after an account principal becomes %s", async (status) => {
  render(await AdminLayout({ children: <div>保護された内容</div> }));
  act(() => useAuthStore.setState({ identity: { ...identity, accountPrincipalStatus: status }, status: "authenticated" }));
  expect(mocks.replace).toHaveBeenCalledWith("/admin/user/profile");
  expect(screen.queryByText("保護された内容")).not.toBeInTheDocument();
});


it.each(["suspended", "forced_stop"] as const)("hides only the Wiki menu when Wiki access is %s", async (wikiPrincipalStatus) => {
  mocks.pathname = "/admin/user/profile";
  const activeIdentity = {
    ...identity,
    accountPolicies: [{ policyIdentifier: "policy-1", name: "ACCOUNT_ADMIN", isSystemPolicy: true, statements: [{ effect: "allow" as const, actions: ["account:update"], resourceTypes: ["ACCOUNT"] }] }],
    siteManagementPrincipalIdentifier: "site-principal",
    siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Administrator", statements: [{ effect: "allow" as const, actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }],
  };
  mocks.loadAdminIdentity.mockResolvedValue(activeIdentity);
  render(await AdminLayout({ children: <PrincipalControls /> }));
  expect(screen.getByRole("link", { name: "Wiki" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: wikiPrincipalStatus }));
  await waitFor(() => expect(screen.queryByRole("link", { name: "Wiki" })).not.toBeInTheDocument());
  expect(screen.getByRole("link", { name: "サイト管理" })).toBeVisible();
  expect(screen.getByRole("link", { name: "アカウント設定" })).toBeVisible();
  expect(screen.getByRole("link", { name: "ユーザー設定" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "active" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Wiki" })).toBeVisible());
});


it.each(["suspended", "forced_stop"] as const)("blocks a direct Wiki page when Wiki access is %s", async (wikiPrincipalStatus) => {
  mocks.loadAdminWikiPrincipalSnapshot.mockResolvedValue({ state: wikiState(wikiPrincipalStatus), updatedAt: Date.now() });
  render(await AdminLayout({ children: <div>Wikiの管理機能</div> }));
  expect(screen.queryByRole("link", { name: "Wiki" })).not.toBeInTheDocument();
  expect(screen.queryByText("Wikiの管理機能")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("利用権限が停止されているため");
  expect(mocks.replace).toHaveBeenCalledWith("/admin/user/profile");
});

it.each([
  ["site", "/admin/site-management/contacts"],
  ["account", "/admin/account/profile"],
  ["user", "/admin/user/profile"],
])("leaves a stopped Wiki for the first visible %s section", async (permissions, destination) => {
  const accountPolicies = [{ policyIdentifier: "account-policy", name: "Account", isSystemPolicy: true, statements: [] }];
  mocks.loadAdminIdentity.mockResolvedValue({
    ...identity,
    accountPolicies: permissions === "user" ? [] : accountPolicies,
    ...(permissions === "site" ? {
      siteManagementPrincipalIdentifier: "site-principal",
      siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Administrator", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }],
    } : {}),
  });
  const view = render(await AdminLayout({ children: <PrincipalControls /> }));
  expect(mocks.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "suspended" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(destination));
  expect(screen.queryByRole("link", { name: "Wiki" })).not.toBeInTheDocument();
  mocks.pathname = destination;
  view.rerender(await AdminLayout({ children: <div>移動先の内容</div> }));
  expect(screen.getByText("移動先の内容")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
