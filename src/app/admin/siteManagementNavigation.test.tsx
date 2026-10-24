import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { AdminShellClient } from "./AdminShellClient";
import { SiteManagementPageClient } from "./site-management/SiteManagementPageClient";
const mocks = vi.hoisted(() => ({ pathname: "/admin/site-management/principal-groups", search: "", identity: {}, replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, redirect: (path: string) => { throw new Error(`redirect:${path}`); }, useSearchParams: () => new URLSearchParams(mocks.search), useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("./AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: mocks.identity, locale: "ja", t: dictionaries.ja.admin }) }));
afterEach(() => {
  cleanup();
  mocks.search = "";
  mocks.pathname = "/admin/site-management/principal-groups";
  mocks.replace.mockReset();
});
const identity = { accountPolicies: [{ policyIdentifier: "account-policy", name: "Account", isSystemPolicy: true, statements: [] }], accountPrincipalStatus: "active" as const, siteManagementPrincipalStatus: "active" as const, language: "ja", identityIdentifier: "actor", identityName: "Admin", email: "a@example.test", accountIdentifier: "account", siteManagementPrincipalIdentifier: "principal", siteManagementPrincipalCount: 2, account: { status: "active" }, siteManagementPolicies: [{ name: "Administrator", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }] };
describe("SiteManagement navigation", () => {
  it("keeps announcement-only access and selects only the announcement tab", () => {
    mocks.pathname = "/admin/site-management/announcements";
    mocks.identity = { ...identity, siteManagementPolicies: [{ name: "Announcements", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["announcement:view-draft"], resourceTypes: ["announcement"], condition: null }] }] };
    render(<AdminShellClient><SiteManagementPageClient activeTab="announcements"><p>announcement content</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("tab", { name: "お知らせ管理" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByText("announcement content")).toBeInTheDocument();
  });
  it("does not select principal groups alongside announcements for a combined manager", () => {
    mocks.pathname = "/admin/site-management/announcements";
    mocks.identity = { ...identity, siteManagementPolicies: [...identity.siteManagementPolicies, { name: "Announcements", policyIdentifier: "announcement", statements: [{ effect: "allow", actions: ["announcement:view-draft"], resourceTypes: ["announcement"], condition: null }] }] };
    render(<SiteManagementPageClient activeTab="announcements">{null}</SiteManagementPageClient>);
    expect(screen.getByRole("tab", { name: "お知らせ管理" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("aria-selected", "false");
  });
  it("replaces an own-viewer's unanswered direct URL with the available shared contact tab", () => {
    mocks.pathname = "/admin/site-management/contacts/unanswered";
    mocks.identity = { ...identity, siteManagementPolicies: [{ name: "Arbitrary name", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
    render(<SiteManagementPageClient>{null}</SiteManagementPageClient>);
    expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts");
    expect(screen.queryByRole("tab", { name: "お問い合わせ管理" })).not.toBeInTheDocument();
  });
  it.each([null, { ...identity, account: { status: "suspended" } }, { ...identity, siteManagementPolicies: [] }])("does not redirect an unauthorized actor into own contacts: %j", (actor) => {
    mocks.pathname = "/admin/site-management/contacts/unanswered";
    mocks.identity = actor as unknown as typeof identity;
    render(<SiteManagementPageClient>{null}</SiteManagementPageClient>);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("selects the contact default route as SiteManagement, not Wiki or principal groups", () => {
    mocks.pathname = "/admin/site-management";
    mocks.identity = { ...identity, siteManagementPolicies: [...identity.siteManagementPolicies, { name: "Unrestricted", policyIdentifier: "contact", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: null }] }] };
    render(<AdminShellClient><SiteManagementPageClient>{null}</SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("aria-selected", "false");
  });
  it("routes own-contact viewers to the shared contact tab without the unanswered tab", () => {
    mocks.pathname = "/admin/site-management/contacts";
    mocks.identity = { ...identity, siteManagementPolicies: [{ name: "Arbitrary name", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
    render(<AdminShellClient><SiteManagementPageClient><p>own contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "お問い合わせ管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "ユーザー権限管理" })).not.toBeInTheDocument();
    expect(screen.getByText("own contacts")).toBeInTheDocument();
  });
  it.each(["/admin/site-management/contacts", "/admin/site-management/contacts/unanswered"])("drops legacy sender conditions from contact tab links from %s", (pathname) => {
    mocks.pathname = pathname;
    mocks.search = "principalIdentifier=019a1234-5678-7000-8000-333333333333&unrelated=ignore";
    mocks.identity = { ...identity, siteManagementPolicies: [...identity.siteManagementPolicies, { name: "Viewer", policyIdentifier: "contacts", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: null }] }] };
    render(<SiteManagementPageClient>{null}</SiteManagementPageClient>);
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveAttribute("href", "/admin/site-management/contacts/manage");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("href", "/admin/site-management/principal-groups");
  });
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
    mocks.pathname = "/admin/site-management/contacts";
    mocks.identity = { ...identity, siteManagementPrincipalCount: 1, siteManagementPolicies: [{ name: "General", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
    render(<AdminShellClient><SiteManagementPageClient><p>My contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "ユーザー権限管理" })).not.toBeInTheDocument();
    expect(screen.getByText("My contacts")).toBeInTheDocument();
  });
  it("keeps both tabs reachable with group management permission", () => {
    mocks.pathname = "/admin/site-management/contacts";
    mocks.identity = { ...identity, siteManagementPolicies: [...identity.siteManagementPolicies, { name: "General", policyIdentifier: "contact-policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
    render(<SiteManagementPageClient><p>My contacts</p></SiteManagementPageClient>);
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("href", "/admin/site-management/principal-groups");
  });

  it("shows the contact tab to a contact viewer without requiring principal-group management", () => {
    mocks.pathname = "/admin/site-management/contacts";
    mocks.identity = { ...identity, siteManagementPrincipalCount: 1, siteManagementPolicies: [{ name: "Contact viewer", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: null }] }] };
    render(<AdminShellClient><SiteManagementPageClient><p>contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveAttribute("aria-selected", "false");
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
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveClass("border-brand-primary", "text-text-strong");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveClass("border-transparent", "text-text-muted");
  });
  it("selects only the management tab on its direct URL and keeps the sidebar selected", () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.identity = { ...identity, siteManagementPolicies: [...identity.siteManagementPolicies, { name: "Contact viewer", policyIdentifier: "contact-policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: null }] }] };
    render(<AdminShellClient><SiteManagementPageClient><p>contacts</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveAttribute("href", mocks.pathname);
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "お問い合わせ管理" })).toHaveClass("border-brand-primary", "text-text-strong");
    expect(screen.getByRole("tab", { name: "自身のお問い合わせ" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "ユーザー権限管理" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("link", { name: "サイト管理" })).toHaveAttribute("aria-current", "page");
  });
});
