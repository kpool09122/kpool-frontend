import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { AccountLayoutClient } from "./account/AccountLayoutClient";
import { WikiLayoutClient } from "./wiki/WikiLayoutClient";
import { SiteManagementPageClient } from "./site-management/SiteManagementPageClient";
import { AdminShellClient } from "./AdminShellClient";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, useRouter: () => navigation, usePathname: () => "/admin/site-management/principal-groups", useSearchParams: () => new URLSearchParams() }));
const siteAdmin = vi.hoisted(() => ({ currentIdentity: {} }));
vi.mock("./AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: siteAdmin.currentIdentity, t: dictionaries.ja.admin }) }));
const identity = { accountPrincipalStatus: "active" as const, siteManagementPrincipalStatus: "active" as const,
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountType: "individual",
  accountPolicies: [{ policyIdentifier: "policy-1", name: "MANAGER", isSystemPolicy: true, statements: [{ effect: "allow", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"], condition: null }] }],
};
const principal = {
  principalIdentifier: "33333333-3333-4333-8333-333333333333",
  identityIdentifier: identity.identityIdentifier,
  isDelegatedPrincipal: false,
  status: "active" as const,
  policies: [{ policyIdentifier: "policy-2", name: "MANAGER", isSystemPolicy: true, statements: [{ effect: "allow", actions: ["principal-group-manage"], resourceTypes: ["principal_group"], condition: null }] }],
};

describe("principal group menu tabs", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it.each([{ statements: [] }, { statements: [{ effect: "deny", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }])("hides the site sidebar entry without effective permissions: %j", ({ statements }) => {
    siteAdmin.currentIdentity = { ...identity, account: { status: "active" }, siteManagementPrincipalIdentifier: principal.principalIdentifier, siteManagementPrincipalCount: 2, siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Administrator", statements }] };
    expect(() => render(<AdminShellClient><SiteManagementPageClient><p>Site management content</p></SiteManagementPageClient></AdminShellClient>)).toThrow("redirect:/admin/wiki/editing");
    expect(screen.queryByRole("link", { name: dictionaries.ja.admin.siteManagementMenu })).not.toBeInTheDocument();
    expect(screen.queryByText("Site management content")).not.toBeInTheDocument();
  });
  it("keeps the site entry for contact permission even when no current tab is available", () => {
    siteAdmin.currentIdentity = { ...identity, account: { status: "active" }, siteManagementPrincipalIdentifier: principal.principalIdentifier, siteManagementPrincipalCount: 1, siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "General", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
    render(<AdminShellClient><SiteManagementPageClient><p>Site management content</p></SiteManagementPageClient></AdminShellClient>);
    expect(screen.getByRole("link", { name: dictionaries.ja.admin.siteManagementMenu })).toBeInTheDocument();
    expect(screen.getByText(dictionaries.ja.admin.siteManagementNoAvailableServices)).toBeInTheDocument();
    expect(screen.queryByText("Site management content")).not.toBeInTheDocument();
  });
  it.each([undefined, 0, 1, 2, 3])("shows site permissions only with at least two site principals: %s", (count) => {
    siteAdmin.currentIdentity = {
      ...identity,
      account: { status: "active" },
      siteManagementPrincipalIdentifier: principal.principalIdentifier,
      siteManagementPrincipalCount: count,
      siteManagementPolicies: [{ policyIdentifier: "site-policy", name: "Administrator", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }],
    };
    render(<AdminShellClient><SiteManagementPageClient><p>Site management content</p></SiteManagementPageClient></AdminShellClient>);
    expect(Boolean(screen.queryByRole("tab", { name: dictionaries.ja.admin.siteManagementPrincipalGroups.title }))).toBe((count ?? 0) >= 2);
    expect(screen.getByRole("link", { name: dictionaries.ja.admin.siteManagementMenu })).toBeInTheDocument();
    expect(Boolean(screen.queryByText("Site management content"))).toBe((count ?? 0) >= 2);
    expect(Boolean(screen.queryByText(dictionaries.ja.admin.siteManagementNoAvailableServices))).toBe((count ?? 0) < 2);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2])("shows account permissions only with at least two Identities: %s", (count) => {
    render(<AccountLayoutClient activeTab="accountProfile" currentIdentity={{ ...identity, accountIdentityCount: count }} t={dictionaries.ja.admin} onAuthorizationRejected={vi.fn()}>{null}</AccountLayoutClient>);
    expect(Boolean(screen.queryByRole("tab", { name: "ユーザー権限管理" }))).toBe(count >= 2);
  });
  it.each([1, 2])("shows Wiki permissions only with at least two Wiki principals: %s", (count) => {
    render(<WikiLayoutClient canViewOfficialVideoInbox={false} isAuthenticated isPending={false} selectedWikiTab="editingWikis" state={{ status: "available", principal: { ...principal, accountPrincipalCount: count } }} t={dictionaries.ja.admin} onActivate={vi.fn()} onRetry={vi.fn()} onOpenCreateDraftWiki={vi.fn()}>{() => null}</WikiLayoutClient>);
    expect(Boolean(screen.queryByRole("tab", { name: "ユーザー権限管理" }))).toBe(count >= 2);
  });
});
