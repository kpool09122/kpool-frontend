import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MonetizationState } from "@/gateways/monetization/monetizationPrincipal";
import { dictionaries } from "@/i18n/dictionaries";
import { AdminShellClient } from "../AdminShellClient";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/wiki/editing",
  state: null as MonetizationState | null,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));
vi.mock("../AdminProvider", () => ({
  useAdmin: () => ({
    currentIdentity: {
      identityIdentifier: "actor", accountIdentifier: "account",
      account: { status: "active" }, accountPrincipalStatus: "active",
      accountPolicies: [], siteManagementPolicies: [],
    },
    monetizationState: mocks.state,
    t: dictionaries.ja.admin,
  }),
}));
const manager: Extract<MonetizationState, { status: "available" }> = {
  status: "available",
  principal: {
    principalIdentifier: "principal", identityIdentifier: "actor", status: "active", accountPrincipalCount: 2,
    policies: [{ policyIdentifier: "policy", name: "Owner", statements: [{ effect: "allow", actions: ["principal_group_manage"], resourceTypes: ["principal_group"], condition: null }] }],
  },
};
const general: MonetizationState = { ...manager, principal: { ...manager.principal, policies: [] } };
const menu = dictionaries.ja.admin.monetizationMenu;
beforeEach(() => { mocks.pathname = "/admin/wiki/editing"; mocks.state = null; });
afterEach(cleanup);

describe("Monetization sidebar access", () => {
  it("keeps settings hidden until access loads and removes the entry after access is lost", () => {
    const view = render(<AdminShellClient>Wiki</AdminShellClient>);
    expect(screen.queryByRole("link", { name: menu })).not.toBeInTheDocument();
    mocks.state = manager;
    view.rerender(<AdminShellClient>Wiki</AdminShellClient>);
    expect(screen.getByRole("link", { name: menu })).toHaveAttribute("href", "/admin/monetization");
    mocks.state = general;
    view.rerender(<AdminShellClient>Wiki</AdminShellClient>);
    expect(screen.queryByRole("link", { name: menu })).not.toBeInTheDocument();
    expect(screen.queryByText(dictionaries.ja.admin.monetization.noPermission)).not.toBeInTheDocument();
  });

  it("preserves the activation entry before enrollment", () => {
    mocks.state = { status: "missing" };
    render(<AdminShellClient>Wiki</AdminShellClient>);
    expect(screen.getByRole("link", { name: menu })).toBeInTheDocument();
  });

  it.each(["/admin/monetization", "/admin/monetization/principal-groups"])("redirects a non-manager from %s", pathname => {
    mocks.pathname = pathname;
    mocks.state = general;
    expect(() => render(<AdminShellClient>settings</AdminShellClient>)).toThrow("redirect:/admin/wiki/editing");
    expect(screen.queryByText("settings")).not.toBeInTheDocument();
  });

  it.each([null, { status: "error" }] satisfies (MonetizationState | null)[])("does not redirect before access is confirmed: %j", state => {
    mocks.pathname = "/admin/monetization";
    mocks.state = state;
    render(<AdminShellClient>loading or retry</AdminShellClient>);
    expect(screen.getByText("loading or retry")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: menu })).not.toBeInTheDocument();
  });
});
