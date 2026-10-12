import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { SiteManagementAccessRefresh } from "@/gateways/site-management/siteManagementPrincipalGroups";
import { SiteManagementPrincipalGroupsClient } from "./SiteManagementPrincipalGroupsClient";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), refreshAccess: null as SiteManagementAccessRefresh | null }));
const identity = { language: "ja", identityIdentifier: "actor", identityName: "Admin", email: "a@example.test", accountIdentifier: "account", siteManagementPrincipalIdentifier: "principal", account: { status: "active" }, siteManagementPolicies: [{ name: "Administrator", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }] };
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: identity, refreshIdentity: mocks.refresh, t: dictionaries.ja.admin }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("./useSiteManagementPrincipalGroups", () => ({ useSiteManagementPrincipalGroups: (props: { refreshAccess: SiteManagementAccessRefresh }) => { mocks.refreshAccess = props.refreshAccess; return { state: { users: [], groups: [], membershipByGroup: {}, canManage: true, hasUnsavedChanges: false, isLoading: false, isSaving: false, loadError: null, saveError: null, success: null }, actions: { load: vi.fn(), save: vi.fn(), updateUserGroups: vi.fn() }, accessStatus: null }; } }));
beforeEach(() => { vi.clearAllMocks(); mocks.refreshAccess = null; useAuthStore.setState({ identity, sessionVersion: 1 }); });
afterEach(() => { cleanup(); useAuthStore.setState(useAuthStore.getInitialState(), true); });
it("refreshes SSR initial identity before the auth store is populated", async () => {
  useAuthStore.setState({ identity: null, status: "loading", sessionVersion: 0 });
  mocks.refresh.mockImplementation(async () => { useAuthStore.getState().setIdentity(identity); return identity; });
  render(<SiteManagementPrincipalGroupsClient />);
  await act(async () => { expect(await mocks.refreshAccess?.()).toBe(true); });
  expect(mocks.refresh).toHaveBeenCalledWith({ preserveOnNull: true });
});
it("refreshes identity preserving ambiguous null, without redirecting", async () => {
  mocks.refresh.mockResolvedValue(null); render(<SiteManagementPrincipalGroupsClient />);
  expect(mocks.refreshAccess).toBeTypeOf("function");
  await act(async () => { expect(await mocks.refreshAccess?.(403)).toBeNull(); });
  expect(mocks.refresh).toHaveBeenCalledWith({ preserveOnNull: true }); expect(mocks.replace).not.toHaveBeenCalled();
});
it("retreats after confirmed self-revocation without a save failure", async () => {
  mocks.refresh.mockResolvedValue({ ...identity, siteManagementPolicies: [] }); render(<SiteManagementPrincipalGroupsClient />);
  await act(async () => { expect(await mocks.refreshAccess?.(403)).toBe(false); });
  expect(mocks.replace).toHaveBeenCalledWith("/admin/user/profile");
});
it("does not redirect stale auth results after an account switch", async () => {
  let resolve!: (value: typeof identity) => void;
  mocks.refresh.mockReturnValue(new Promise((done) => { resolve = done; })); render(<SiteManagementPrincipalGroupsClient />);
  const pending = mocks.refreshAccess?.(403);
  useAuthStore.getState().setIdentity({ ...identity, accountIdentifier: "new" });
  resolve(identity); await expect(pending).resolves.toBeNull(); expect(mocks.replace).not.toHaveBeenCalled();
});
