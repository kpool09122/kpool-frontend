import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { MonetizationClient } from "./MonetizationClient";
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const api = vi.hoisted(() => ({ principal: vi.fn(), activate: vi.fn(), groups: vi.fn(), save: vi.fn(), refresh: vi.fn(), identity: null as unknown as AuthenticatedIdentitySummary }));
vi.mock("../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: api.identity, refreshIdentity: api.refresh, t: dictionaries.ja.admin }) }));
vi.mock("@/gateways/monetization/monetizationPrincipal", async load => ({ ...await load<typeof import("@/gateways/monetization/monetizationPrincipal")>(), getMonetizationPrincipal: api.principal, activateMonetization: api.activate, fetchMonetizationGroups: api.groups, saveMonetizationGroups: api.save }));
const snapshot = { status: "available" as const, principal: { principalIdentifier: id, identityIdentifier: id, status: "active" as const, accountPrincipalCount: 2, policies: [{ policyIdentifier: id, name: "Owner", statements: [{ effect: "allow" as const, actions: ["principal_group_manage" as const], resourceTypes: ["principal_group" as const], condition: null }] }] } };
const users = [id, other].map((principalIdentifier, index) => ({ principalIdentifier, identityIdentifier: principalIdentifier, identityName: index ? "Successor" : "Original", email: `${index}@example.test`, status: "active" as const }));
const list = { groups: [{ principalGroupIdentifier: id, accountIdentifier: id, name: "Owners", description: "Administrators", roleIdentifiers: [other], isDefault: false, members: [users[0]] }], users };
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><MonetizationClient /></QueryClientProvider>); }
function editSuccessorGroups() {
 const row = screen.getByRole("heading", { name: "Successor" }).closest("article")!;
 fireEvent.click(within(row).getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupEditUserGroups }));
 fireEvent.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: "Owners" }));
 fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupDialogConfirm }));
}
beforeEach(() => {
 api.identity = { identityIdentifier: id, identityName: "Actor", email: "actor@example.test", language: "ja", accountIdentifier: id, accountPrincipalIdentifier: id, account: { status: "active" }, accountPrincipalStatus: "active", accountPolicies: [], siteManagementPolicies: [], siteManagementPrincipalStatus: "active" };
 useAuthStore.setState({ identity: api.identity, status: "authenticated", sessionVersion: 1 });
 api.principal.mockReset().mockResolvedValue(snapshot); api.activate.mockReset().mockResolvedValue({ ok: true }); api.groups.mockReset().mockResolvedValue(list); api.save.mockReset().mockResolvedValue({ committed: true, refresh: { ok: true, data: list } });
 api.refresh.mockReset().mockImplementation(async () => { useAuthStore.setState({ status: "loading" }); await Promise.resolve(); useAuthStore.setState({ status: "authenticated", identity: api.identity }); return api.identity; });
});
afterEach(cleanup);
describe("Monetization settings", () => {
 it("only enrolls explicitly and disables duplicate activation while awaiting authoritative access", async () => {
  api.principal.mockResolvedValueOnce({ status: "missing" }).mockResolvedValue(snapshot);
  let finish!: (value: { ok: true }) => void;
  api.activate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  renderPage(); const button = await screen.findByRole("button", { name: "利用を開始する" });
  expect(api.activate).not.toHaveBeenCalled(); fireEvent.click(button); fireEvent.click(button);
  expect(api.activate).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "利用開始中…" })).toBeDisabled();
  await act(async () => finish({ ok: true }));
  expect(await screen.findByRole("tab", { name: dictionaries.ja.admin.wikiPrincipalGroupManagementTab, selected: true })).toHaveAttribute("href", "/admin/monetization/principal-groups");
  expect(screen.queryByRole("heading", { name: dictionaries.ja.admin.monetization.title })).not.toBeInTheDocument();
  expect(screen.queryByText(dictionaries.ja.admin.monetization.description)).not.toBeInTheDocument();
  expect(screen.queryByText("利用中です。")).not.toBeInTheDocument();
  expect(api.principal).toHaveBeenCalledTimes(2);
 });
 it.each(["suspended", "forced_stop"])("shows stopped %s without activation or management", async status => {
  api.principal.mockResolvedValue({ ...snapshot, principal: { ...snapshot.principal, status } }); renderPage();
  expect(await screen.findByText(dictionaries.ja.admin.monetization.stopped)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "利用を開始する" })).not.toBeInTheDocument(); expect(api.groups).not.toHaveBeenCalled();
 });
 it("shows a retryable error and does not mistake errors for missing enrollment", async () => {
  api.principal.mockResolvedValueOnce({ status: "error" }).mockResolvedValue(snapshot); renderPage();
  expect(await screen.findByText(dictionaries.ja.admin.monetization.error)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "再取得" })); expect(await screen.findByRole("tab", { name: dictionaries.ja.admin.wikiPrincipalGroupManagementTab })).toBeInTheDocument();
 });
 it.each([403, 500])("reports activation failure %s", async status => {
  api.principal.mockResolvedValue({ status: "missing" }); api.activate.mockResolvedValue({ ok: false, status }); renderPage(); fireEvent.click(await screen.findByRole("button", { name: "利用を開始する" })); expect(await screen.findByText(dictionaries.ja.admin.monetization.activationFailed)).toBeInTheDocument();
 });
 it("refetches after enrollment conflict instead of restoring privileges", async () => {
  api.principal.mockResolvedValueOnce({ status: "missing" }).mockResolvedValue({ ...snapshot, principal: { ...snapshot.principal, status: "suspended" } }); api.activate.mockResolvedValue({ ok: false, status: 409 }); renderPage(); fireEvent.click(await screen.findByRole("button", { name: "利用を開始する" })); expect(await screen.findByText(dictionaries.ja.admin.monetization.stopped)).toBeInTheDocument();
 });
 it("hides management for a non-manager", async () => {
  api.principal.mockResolvedValue({ ...snapshot, principal: { ...snapshot.principal, policies: [] } }); renderPage(); await screen.findByRole("region", { name: dictionaries.ja.admin.monetizationMenu }); expect(screen.queryByText(dictionaries.ja.admin.monetization.noPermission)).not.toBeInTheDocument(); expect(screen.queryByRole("tab", { name: dictionaries.ja.admin.wikiPrincipalGroupManagementTab })).not.toBeInTheDocument(); expect(api.groups).not.toHaveBeenCalled();
 });
 it("submits successor membership and old manager suspension in one atomic save", async () => {
  renderPage(); await screen.findByText("Successor");
  editSuccessorGroups();
  fireEvent.click(within(screen.getByRole("heading", { name: "Original" }).closest("article")!).getByRole("switch", { name: dictionaries.ja.admin.principalStatus.label }));
  fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupSave }));
  await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ principalGroups: [{ principalGroupIdentifier: id, principalIdentifiers: [id, other] }], principalStatuses: [{ principalIdentifier: id, status: "suspended" }, { principalIdentifier: other, status: "active" }] }), expect.any(String)));
  expect(await screen.findByText("変更を保存しました。")).toBeInTheDocument();
 });
 it("localizes backend administrator protection and never reports success", async () => {
  api.save.mockRejectedValue(Object.assign(new Error("Conflict"), { status: 409, code: "last_active_manager" })); renderPage(); await screen.findByText("Successor"); editSuccessorGroups(); fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupSave })); expect(await screen.findByText(dictionaries.ja.admin.principalStatus.lastManager)).toBeInTheDocument(); expect(screen.queryByText("変更を保存しました。")).not.toBeInTheDocument();
 });
 it("retains committed-save feedback while removing controls after self-revocation", async () => {
  api.principal.mockResolvedValueOnce(snapshot).mockResolvedValue({ ...snapshot, principal: { ...snapshot.principal, policies: [] } }); renderPage(); await screen.findByText("Successor"); editSuccessorGroups(); fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupSave }));
  await waitFor(() => {
   expect(screen.queryByRole("tab")).not.toBeInTheDocument();
   expect(screen.getByText(dictionaries.ja.admin.principalStatus.savedRefreshFailed)).toBeInTheDocument();
  });
  expect(screen.queryByText(dictionaries.ja.admin.monetization.noPermission)).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupEditUserGroups })).not.toBeInTheDocument();
 });
 it("does not replay a committed save when list refresh fails", async () => {
  api.save.mockResolvedValue({ committed: true, refresh: { ok: false, status: 500, message: "Refresh failed" } }); renderPage(); await screen.findByText("Successor"); editSuccessorGroups(); fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupSave })); await screen.findByText(dictionaries.ja.admin.principalStatus.savedRefreshFailed); fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupRetry })); await screen.findByText("変更を保存しました。"); expect(api.save).toHaveBeenCalledTimes(1);
 });
 it("discards account-A drafts and late save results after switching to B", async () => {
  let finish!: (value: unknown) => void; api.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = renderPage(); await screen.findByText("Successor"); editSuccessorGroups(); fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.wikiPrincipalGroupSave }));
  api.identity = { ...api.identity, accountIdentifier: other }; api.principal.mockResolvedValue({ status: "missing" }); act(() => useAuthStore.setState({ identity: api.identity }));
  await screen.findByRole("button", { name: "利用を開始する" }); await act(async () => finish({ committed: true, refresh: { ok: true, data: list } })); expect(screen.queryByText("Successor")).not.toBeInTheDocument(); expect(screen.queryByText("変更を保存しました。")).not.toBeInTheDocument(); view.unmount();
 });
 it("ignores an account-A principal response that arrives after switching to B", async () => {
  let finish!: (value: unknown) => void;
  api.principal.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ status: "missing" });
  renderPage(); await waitFor(() => expect(api.principal).toHaveBeenCalledTimes(1));
  api.identity = { ...api.identity, accountIdentifier: other };
  act(() => useAuthStore.setState({ identity: api.identity }));
  await screen.findByRole("button", { name: "利用を開始する" });
  await act(async () => finish(snapshot));
  expect(screen.queryByText("Successor")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "利用を開始する" })).toBeEnabled();
 });
 it("does not refetch B with an activation result owned by account A", async () => {
  let finish!: (value: unknown) => void;
  api.principal.mockResolvedValue({ status: "missing" }); api.activate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  renderPage(); fireEvent.click(await screen.findByRole("button", { name: "利用を開始する" }));
  api.identity = { ...api.identity, accountIdentifier: other };
  act(() => useAuthStore.setState({ identity: api.identity }));
  await screen.findByRole("button", { name: "利用を開始する" });
  const calls = api.principal.mock.calls.length;
  await act(async () => finish({ ok: true }));
  expect(api.principal).toHaveBeenCalledTimes(calls);
  expect(screen.getByRole("button", { name: "利用を開始する" })).toBeEnabled();
 });
 it("initializes a fresh direct-load browser identity before querying private data", async () => {
  useAuthStore.setState({ identity: null, status: "loading", sessionVersion: 0 }); renderPage(); await screen.findByText("Successor"); expect(api.refresh).toHaveBeenCalled();
 });
});
