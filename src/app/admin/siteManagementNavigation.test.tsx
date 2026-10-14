import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { AdminShellClient } from "./AdminShellClient";
import { SiteManagementPageClient } from "./site-management/SiteManagementPageClient";
const mocks = vi.hoisted(() => ({ pathname: "/admin/site-management/principal-groups", identity: {} }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, redirect: (path: string) => { throw new Error(`redirect:${path}`); }, useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: mocks.identity, t: dictionaries.ja.admin }) }));
afterEach(() => {
  cleanup();
  mocks.pathname = "/admin/site-management/principal-groups";
});
const identity = { accountPolicies: [{ policyIdentifier: "account-policy", name: "Account", isSystemPolicy: true, statements: [] }], accountPrincipalStatus: "active" as const, siteManagementPrincipalStatus: "active" as const, language: "ja", identityIdentifier: "actor", identityName: "Admin", email: "a@example.test", accountIdentifier: "account", siteManagementPrincipalIdentifier: "principal", siteManagementPrincipalCount: 2, account: { status: "active" }, siteManagementPolicies: [{ name: "Administrator", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }] };
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
    expect(() => render(<AdminShellClient><SiteManagementPageClient>{null}</SiteManagementPageClient></AdminShellClient>)).toThrow("redirect:/admin/wiki/editing");
    expect(screen.queryByRole("link", { name: "サイト管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
  it("shows contacts for own-contact permission without exposing group management", () => {
    mocks.identity = { ...identity, siteManagementPrincipalCount: 1, siteManagementPolicies: [{ name: "General", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
    render(<AdminShellClient><SiteManagementPageClient activeTab="contacts"><p>My contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: "お問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "ユーザー権限管理" })).not.toBeInTheDocument();
    expect(screen.getByText("My contacts")).toBeInTheDocument();
  });
  it("keeps both tabs reachable with group management permission", () => {
    mocks.identity = identity;
    render(<SiteManagementPageClient activeTab="contacts"><p>My contacts</p></SiteManagementPageClient>);
    expect(screen.getByRole("tab", { name: "お問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("href", "/admin/site-management/principal-groups");
  });

  it("shows the contact tab to a contact viewer without requiring principal-group management", () => {
    mocks.pathname = "/admin/site-management/contacts";
    mocks.identity = { ...identity, siteManagementPrincipalCount: 1, siteManagementPolicies: [{ name: "Contact viewer", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: null }] }] };
    render(<AdminShellClient><SiteManagementPageClient><p>contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "ユーザー権限管理" })).not.toBeInTheDocument();
  });
  it("visually distinguishes the active site-management tab", () => {
    mocks.pathname = "/admin/site-management/contacts";
    mocks.identity = {
      ...identity,
      siteManagementPolicies: [
        ...identity.siteManagementPolicies,
        { name: "Contact viewer", policyIdentifier: "contact-policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: null }] },
      ],
    };
    render(<AdminShellClient><SiteManagementPageClient><p>contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveClass("border-brand-primary", "text-text-strong");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveClass("border-transparent", "text-text-muted");
  });

});
