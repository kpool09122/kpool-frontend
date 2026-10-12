import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { AdminShellClient } from "./AdminShellClient";
import { SiteManagementPageClient } from "./site-management/SiteManagementPageClient";
const mocks = vi.hoisted(() => ({ pathname: "/admin/site-management/principal-groups", identity: {} }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useSearchParams: () => new URLSearchParams() }));
vi.mock("./AdminProvider", () => ({ useAdmin: () => ({ canShowAccountSettings: true, currentIdentity: mocks.identity, t: dictionaries.ja.admin }) }));
afterEach(cleanup);
const identity = { language: "ja", identityIdentifier: "actor", identityName: "Admin", email: "a@example.test", accountIdentifier: "account", siteManagementPrincipalIdentifier: "principal", siteManagementPrincipalCount: 2, account: { status: "active" }, siteManagementPolicies: [{ name: "Administrator", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }] };
describe("SiteManagement navigation", () => {
  it("orders Wiki → SiteManagement → Account and marks the active section", () => {
    mocks.identity = identity;
    render(<AdminShellClient><SiteManagementPageClient><p>permissions</p></SiteManagementPageClient></AdminShellClient>);
    const links = screen.getByRole("complementary").querySelectorAll("nav a");
    expect(Array.from(links, (link) => link.textContent)).toEqual(["Wiki", "サイト管理", "アカウント設定", "ユーザー設定"]);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("サイト管理");
    expect(screen.getByRole("tablist", { name: "サイト管理タブ" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("href", "/admin/site-management/principal-groups");
  });
  it("does not show a management link for a Principal ID without policies", () => {
    mocks.identity = { ...identity, siteManagementPolicies: [] };
    render(<AdminShellClient><SiteManagementPageClient>{null}</SiteManagementPageClient></AdminShellClient>);
    expect(screen.queryByRole("link", { name: "サイト管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
