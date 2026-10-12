import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useSiteManagementPrincipalGroups } from "./useSiteManagementPrincipalGroups";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn(), refreshAccess: vi.fn() }));
vi.mock("@/gateways/site-management/siteManagementPrincipalGroups", async (original) => ({ ...await original<typeof import("@/gateways/site-management/siteManagementPrincipalGroups")>(), fetchSiteManagementPrincipalGroups: mocks.fetch, saveSiteManagementPrincipalGroups: mocks.save }));
const body = { principalGroups: [{ principalGroupIdentifier: "group", accountIdentifier: "account", name: "Administrator", roleIdentifiers: [], isDefault: false, members: [] }], principals: [{ principalIdentifier: "user", identityIdentifier: "identity", identityName: "User", email: "user@example.test" }] };
const latest = { ...body, principalGroups: [{ ...body.principalGroups[0], name: "Latest", members: body.principals }] };
const t = dictionaries.ja.admin.siteManagementPrincipalGroups;
const props = { accountIdentifier: "account", actorIdentifier: "actor", sessionVersion: 1, canManage: true, t, refreshAccess: mocks.refreshAccess };
function Wrapper({ children }: { children: ReactNode }) { const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } })); return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
beforeEach(() => { mocks.fetch.mockReset().mockResolvedValue(body); mocks.save.mockReset().mockResolvedValue({ committed: true, refresh: { ok: true, data: latest } }); mocks.refreshAccess.mockReset().mockResolvedValue(true); });
const edit = async (result: { current: ReturnType<typeof useSiteManagementPrincipalGroups> }) => { await waitFor(() => expect(result.current.state.users).toHaveLength(1)); act(() => result.current.actions.updateUserGroups("user", ["group"])); };
describe("SiteManagement hook", () => {
  it("saves memberships, adopts authoritative list, and refreshes authorization", async () => {
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper });
    await edit(result); await act(async () => { await result.current.actions.save(); });
    expect(mocks.save).toHaveBeenCalledWith({ principalGroups: [{ principalGroupIdentifier: "group", principalIdentifiers: ["user"] }] });
    expect(mocks.refreshAccess).toHaveBeenCalledTimes(1);
    expect(result.current.state.groups[0].name).toBe("Latest");
    expect(result.current.state.hasUnsavedChanges).toBe(false);
    expect(result.current.state.success).toBe(t.saved);
  });
  it.each([401,403,502])("stops editing after committed GET%s and retries only GET/auth", async (status) => {
    mocks.save.mockResolvedValue({ committed: true, refresh: { ok: false, status, kind: "http", message: "unavailable" } });
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper });
    await edit(result); await act(async () => { await result.current.actions.save(); });
    expect(result.current.state.saveError).toBeNull(); expect(result.current.state.success).toBe(t.savedRefreshFailed);
    expect(result.current.state.canManage).toBe(false); expect(result.current.state.canRetryRefresh).toBe(true);
    act(() => { result.current.actions.updateUserGroups("user", []); result.current.actions.save(); });
    mocks.fetch.mockResolvedValue(latest);
    await act(async () => { await result.current.actions.load(); });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.refreshAccess).toHaveBeenCalledTimes(2); expect(result.current.state.canManage).toBe(true);
  });
  it("locks editing and retains refresh retry when identity cannot be confirmed", async () => {
    mocks.refreshAccess.mockResolvedValue(null);
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    expect(result.current.state.canManage).toBe(false); expect(result.current.state.canRetryRefresh).toBe(true);
    expect(result.current.state.success).toBe(t.savedRefreshFailed);
    mocks.refreshAccess.mockResolvedValue(true); mocks.fetch.mockResolvedValue(latest);
    await act(async () => { await result.current.actions.load(); });
    expect(result.current.state.canManage).toBe(true); expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it("retains draft and last-administrator error on PATCH422", async () => {
    mocks.save.mockRejectedValue({ status: 422 });
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    expect(result.current.state.membershipByGroup.group).toEqual(["user"]); expect(result.current.state.hasUnsavedChanges).toBe(true);
    expect(result.current.state.saveError).toBe(t.lastAdministrator); expect(mocks.refreshAccess).not.toHaveBeenCalled();
  });
  it.each(["accountIdentifier", "actorIdentifier", "sessionVersion"] as const)("ignores save results after %s changes", async (key) => {
    let resolve!: (value: unknown) => void; mocks.save.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result, rerender } = renderHook((input) => useSiteManagementPrincipalGroups(input), { wrapper: Wrapper, initialProps: props });
    await edit(result); act(() => { void result.current.actions.save(); });
    rerender({ ...props, [key]: key === "sessionVersion" ? 2 : "new" });
    await act(async () => { resolve({ committed: true, refresh: { ok: true, data: latest } }); });
    expect(result.current.state.success).toBeNull(); expect(result.current.state.hasUnsavedChanges).toBe(false); expect(mocks.refreshAccess).not.toHaveBeenCalled();
  });
  it("allows GET/auth recovery while retaining a draft after PATCH401", async () => {
    mocks.save.mockRejectedValue({ status: 401 }); mocks.refreshAccess.mockResolvedValue(null);
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    expect(result.current.state.membershipByGroup.group).toEqual(["user"]); expect(result.current.state.canRetryRefresh).toBe(true);
    mocks.refreshAccess.mockResolvedValue(true);
    await act(async () => { await result.current.actions.load(); });
    expect(mocks.fetch).toHaveBeenCalledTimes(2); expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(result.current.state.canManage).toBe(true); expect(result.current.state.hasUnsavedChanges).toBe(true);
  });
  it("preserves concurrent unedited memberships and new groups after auth recovery", async () => {
    const oldOther = { ...body.principalGroups[0], principalGroupIdentifier: "other", members: [{ ...body.principals[0], principalIdentifier: "old-other" }] };
    mocks.fetch.mockResolvedValue({ ...body, principalGroups: [...body.principalGroups, oldOther] });
    mocks.save.mockRejectedValueOnce({ status: 401 }); mocks.refreshAccess.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    const newMember = { ...body.principals[0], principalIdentifier: "new-other" };
    mocks.fetch.mockResolvedValue({ ...body, principalGroups: [...body.principalGroups, { ...oldOther, members: [newMember] }, { ...oldOther, principalGroupIdentifier: "new-group", members: [newMember] }] });
    await act(async () => { await result.current.actions.load(); });
    await act(async () => { await result.current.actions.save(); });
    expect(mocks.save.mock.calls[1][0]).toEqual({ principalGroups: [{ principalGroupIdentifier: "group", principalIdentifiers: ["user"] }, { principalGroupIdentifier: "other", principalIdentifiers: ["new-other"] }, { principalGroupIdentifier: "new-group", principalIdentifiers: ["new-other"] }] });
  });
  it.each(["get", "identity"])("reports manual %s refresh failure and recovers without PATCH", async (kind) => {
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.users).toHaveLength(1));
    if (kind === "get") mocks.fetch.mockRejectedValueOnce(new Error("offline"));
    else mocks.refreshAccess.mockResolvedValueOnce(null);
    await act(async () => { await result.current.actions.load(); });
    expect(result.current.state.loadError).toBe(t.loadFailed);
    expect(result.current.state.canManage).toBe(false);
    await act(async () => { await result.current.actions.load(); });
    expect(result.current.state.loadError).toBeNull(); expect(result.current.state.canManage).toBe(true); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects repeated save clicks while a PATCH is pending", async () => {
    let resolve!: (value: unknown) => void; mocks.save.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    act(() => { void result.current.actions.save(); void result.current.actions.save(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ committed: true, refresh: { ok: true, data: latest } }); });
  });
  it("keeps committed state locked when authorization refresh rejects", async () => {
    mocks.refreshAccess.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    expect(result.current.state.success).toBe(t.savedRefreshFailed); expect(result.current.state.saveError).toBeNull();
    expect(result.current.state.canManage).toBe(false); expect(result.current.state.canRetryRefresh).toBe(true);
  });
  it("does not retry a mutation after confirmed self-revocation", async () => {
    mocks.save.mockResolvedValue({ committed: true, refresh: { ok: false, status: 403, kind: "http", message: "unavailable" } });
    mocks.refreshAccess.mockResolvedValue(false);
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    expect(result.current.state.canManage).toBe(false); expect(result.current.state.canRetryRefresh).toBe(false);
    await act(async () => { await result.current.actions.load(); await result.current.actions.save(); });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["accountIdentifier", "actorIdentifier", "sessionVersion"] as const)("ignores GET retry results after %s changes", async (key) => {
    mocks.refreshAccess.mockResolvedValue(null);
    const { result, rerender } = renderHook((input) => useSiteManagementPrincipalGroups(input), { wrapper: Wrapper, initialProps: props }); await edit(result);
    await act(async () => { await result.current.actions.save(); });
    let resolve!: (value: unknown) => void; mocks.fetch.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    act(() => { void result.current.actions.load(); });
    rerender({ ...props, [key]: key === "sessionVersion" ? 2 : "new" });
    await act(async () => { resolve({ ...latest, principalGroups: [{ ...latest.principalGroups[0], name: "STALE" }] }); });
    expect(result.current.state.groups.some((group) => group.name === "STALE")).toBe(false);
    expect(result.current.state.success).toBeNull(); expect(mocks.refreshAccess).toHaveBeenCalledTimes(1);
  });
  it("does not fetch for denied access", () => {
    renderHook(() => useSiteManagementPrincipalGroups({ ...props, canManage: false }), { wrapper: Wrapper }); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not show fetch errors as an empty successful list", async () => {
    mocks.fetch.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSiteManagementPrincipalGroups(props), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.loadError).toBe(t.loadFailed));
  });
});
