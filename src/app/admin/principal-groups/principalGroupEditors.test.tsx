import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAccountPrincipalGroups } from "../account/principal-groups/useAccountPrincipalGroups";
import { useWikiPrincipalGroups } from "../wiki/principal-groups/useWikiPrincipalGroups";
import { useSiteManagementPrincipalGroups } from "../site-management/principal-groups/useSiteManagementPrincipalGroups";
const api = vi.hoisted(() => ({
  members: vi.fn(),
  groups: vi.fn(),
  save: vi.fn(),
  access: vi.fn(),
}));
vi.mock("@/gateways/account/accountBrowserApi", async (load) => ({
  ...(await load<typeof import("@/gateways/account/accountBrowserApi")>()),
  fetchAccountMembers: api.members,
  fetchPrincipalGroups: api.groups,
}));
vi.mock("@/gateways/account/accountPrincipalGroups", () => ({
  saveAccountPrincipalGroups: api.save,
}));
vi.mock("@/gateways/wiki/wikiPrincipalGroups", async (load) => ({
  ...(await load<typeof import("@/gateways/wiki/wikiPrincipalGroups")>()),
  fetchWikiPrincipalGroups: async () => {
    const data = await api.groups();
    return {
      principalGroups: [
        ...data.principalGroups,
        {
          ...data.principalGroups[0],
          principalGroupIdentifier: "default",
          members: data.principals,
        },
      ],
    };
  },
  updateWikiPrincipalGroupMembers: api.save,
}));
vi.mock(
  "@/gateways/site-management/siteManagementPrincipalGroups",
  async (load) => ({
    ...(await load<
      typeof import("@/gateways/site-management/siteManagementPrincipalGroups")
    >()),
    fetchSiteManagementPrincipalGroups: api.groups,
    saveSiteManagementPrincipalGroups: api.save,
  }),
);
const group = {
  principalGroupIdentifier: "g",
  accountIdentifier: "a",
  name: "Managers",
  isDefault: false,
  roleIdentifiers: [],
  members: [],
};
const users = ["active", "suspended", "forced_stop"].map((status, i) => ({
  principalIdentifier: `u${i}`,
  identityIdentifier: `i${i}`,
  identityName: `User${i}`,
  email: `u${i}@example.test`,
  status,
  principalGroups: [],
}));
const list = { principalGroups: [group], principals: users, members: users };
const t = dictionaries.ja.admin;
function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const base = {
  canManage: true,
  accountIdentifier: "a",
  actorIdentifier: "actor",
  sessionVersion: 1,
  refreshAccess: api.access,
  t,
};
const hooks = {
  account: function useAccountEditor(sessionVersion: number, canManage = true) {
    const result = useAccountPrincipalGroups({
      ...base,
      sessionVersion,
      canManage,
    });
    return {
      state: result.state,
      actions: {
        save: result.save,
        load: result.load,
        updateUserStatus: result.updateUserStatus,
        updateUserGroups: result.updateUserGroups,
      },
    };
  },
  wiki: function useWikiEditor(sessionVersion: number, canManage = true) {
    const result = useWikiPrincipalGroups({
      ...base,
      sessionVersion,
      canManage,
    });
    return {
      state: result.state,
      actions: {
        save: result.save,
        load: result.load,
        updateUserStatus: result.updateUserStatus,
        updateUserGroups: result.updateUserGroups,
      },
    };
  },
  site: function useSiteEditor(sessionVersion: number, canManage = true) {
    return useSiteManagementPrincipalGroups({
      ...base,
      sessionVersion,
      canManage,
      t: t.siteManagementPrincipalGroups,
    });
  },
};
afterEach(cleanup);
beforeEach(() => {
  api.members.mockReset().mockResolvedValue({ members: users });
  api.groups.mockReset().mockResolvedValue(list);
  api.save.mockReset().mockResolvedValue({
    committed: true,
    refresh: {
      ok: true,
      data: {
        ...list,
        principalGroups: [
          ...list.principalGroups,
          { ...group, principalGroupIdentifier: "default", members: users },
        ],
      },
    },
  });
  api.access.mockReset().mockResolvedValue(true);
});
for (const [context, useEditor] of Object.entries(hooks))
  describe(`${context} atomic principal editor`, () => {
    const ready = async () => {
      const hook = renderHook(({ version }) => useEditor(version), {
        wrapper: Wrapper,
        initialProps: { version: 1 },
      });
      await waitFor(() =>
        expect(hook.result.current.state.users).toHaveLength(3),
      );
      return hook;
    };
    it("does not fetch, edit or save without management permission", async () => {
      const { result } = renderHook(() => useEditor(1, false), {
        wrapper: Wrapper,
      });
      act(() => {
        result.current.actions.updateUserStatus("u1", "active");
        result.current.actions.updateUserGroups("u1", ["g"]);
      });
      await act(async () => {
        await result.current.actions.save();
      });
      expect(api.groups).not.toHaveBeenCalled();
      expect(api.members).not.toHaveBeenCalled();
      expect(api.save).not.toHaveBeenCalled();
      expect(result.current.state.canManage).toBe(false);
    });
    it("distinguishes committed self-suspension from a failed write and stops stale editing", async () => {
      api.save.mockResolvedValue({
        committed: true,
        refresh: { ok: false, status: 403, message: "stopped" },
      });
      api.access.mockResolvedValue(false);
      const { result } = await ready();
      act(() => result.current.actions.updateUserStatus("u0", "suspended"));
      await act(async () => {
        await result.current.actions.save();
      });
      expect(api.access).toHaveBeenCalledWith(403);
      expect(result.current.state.saveError).toBeNull();
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(result.current.state.success).toBeTruthy();
      expect(result.current.state.canManage).toBe(false);
      expect(result.current.state.canRetryRefresh).toBe(false);
      await act(async () => {
        await result.current.actions.save();
        await result.current.actions.load();
      });
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(api.groups).toHaveBeenCalledTimes(1);
    });
    it("stages multiple statuses and memberships, preserves forced-stop, saves once, and resets from server", async () => {
      const { result } = await ready();
      act(() => {
        result.current.actions.updateUserGroups("u1", ["g"]);
        result.current.actions.updateUserStatus("u0", "suspended");
        result.current.actions.updateUserStatus("u1", "active");
        result.current.actions.updateUserStatus("u2", "active");
      });
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      expect(api.save).not.toHaveBeenCalled();
      await act(async () => {
        await result.current.actions.save();
      });
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(
        context === "wiki"
          ? api.save.mock.calls[0][0].requestBody
          : api.save.mock.calls[0][0],
      ).toEqual({
        principalGroups: [
          { principalGroupIdentifier: "g", principalIdentifiers: ["u1"] },
          ...(context === "wiki"
            ? [
                {
                  principalGroupIdentifier: "default",
                  principalIdentifiers: ["u0", "u2"],
                },
              ]
            : []),
        ],
        principalStatuses: [
          { principalIdentifier: "u0", status: "suspended" },
          { principalIdentifier: "u1", status: "active" },
          { principalIdentifier: "u2", status: "forced_stop" },
        ],
      });
      expect(api.access).toHaveBeenCalledTimes(1);
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(result.current.state.users[0].status).toBe("active");
    });
    it("does not duplicate a pending PATCH or accept more edits during save", async () => {
      let finish!: (value: unknown) => void;
      api.save.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      const { result } = await ready();
      act(() => result.current.actions.updateUserStatus("u1", "active"));
      act(() => {
        void result.current.actions.save();
        void result.current.actions.save();
        result.current.actions.updateUserStatus("u0", "suspended");
      });
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(result.current.state.users[0].status).toBe("active");
      await act(async () =>
        finish({
          committed: true,
          refresh: { ok: false, status: 503, message: "offline" },
        }),
      );
    });
    it("preserves the complete draft on transport failure and permits explicit retry", async () => {
      api.save.mockRejectedValueOnce(new Error("offline"));
      const { result } = await ready();
      act(() => {
        result.current.actions.updateUserStatus("u1", "active");
        result.current.actions.updateUserGroups("u1", ["g"]);
      });
      await act(async () => {
        await result.current.actions.save();
      });
      expect(result.current.state.saveError).toBe("offline");
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      expect(result.current.state.canManage).toBe(true);
      expect(result.current.state.users[1].status).toBe("active");
      expect(result.current.state.membershipByGroup.g).toEqual(["u1"]);
      expect(result.current.state.success).toBeNull();
      await act(async () => {
        await result.current.actions.save();
      });
      expect(api.save).toHaveBeenCalledTimes(2);
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });
    it("makes status-only changes saveable and reverting clears dirty state", async () => {
      const { result } = await ready();
      act(() => result.current.actions.updateUserStatus("u1", "active"));
      expect(result.current.state.hasUnsavedChanges).toBe(true);
      act(() => result.current.actions.updateUserStatus("u1", "suspended"));
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });
    it.each(["last_active_manager", "principal_status_change_forbidden"])(
      "keeps all failed changes uncommitted and refreshes after %s",
      async (code) => {
        api.save.mockRejectedValue({ status: 409, code });
        const { result } = await ready();
        act(() => {
          result.current.actions.updateUserStatus("u0", "suspended");
          result.current.actions.updateUserGroups("u1", ["g"]);
        });
        await act(async () => {
          await result.current.actions.save();
        });
        expect(result.current.state.success).toBeNull();
        expect(result.current.state.hasUnsavedChanges).toBe(true);
        expect(result.current.state.membershipByGroup.g).toEqual(["u1"]);
        expect(result.current.state.users[0].status).toBe("suspended");
        expect(result.current.state.saveError).toBe(
          code === "last_active_manager"
            ? t.principalStatus.lastManager
            : t.principalStatus.forbiddenChange,
        );
        expect(api.groups).toHaveBeenCalledTimes(2);
      },
    );
    it("adopts externally forced-stop state on conflict without sending another PATCH", async () => {
      api.save.mockRejectedValue({
        status: 409,
        code: "principal_status_change_forbidden",
      });
      const { result } = await ready();
      act(() => {
        result.current.actions.updateUserStatus("u0", "suspended");
        result.current.actions.updateUserGroups("u1", ["g"]);
      });
      const latestUsers = users.map((user, i) =>
        i === 0 ? { ...user, status: "forced_stop" } : user,
      );
      api.members.mockResolvedValue({ members: latestUsers });
      api.groups.mockResolvedValue({ ...list, principals: latestUsers });
      await act(async () => {
        await result.current.actions.save();
      });
      expect(result.current.state.users[0].status).toBe("forced_stop");
      expect(result.current.state.membershipByGroup.g).toEqual(["u1"]);
      expect(result.current.state.success).toBeNull();
      expect(api.save).toHaveBeenCalledTimes(1);
    });
    it("locks stale editing on inactive 403 and revalidates current access", async () => {
      api.save.mockRejectedValue({ status: 403, code: "principal_inactive" });
      api.access.mockResolvedValue(false);
      const { result } = await ready();
      act(() => result.current.actions.updateUserStatus("u1", "active"));
      await act(async () => {
        await result.current.actions.save();
      });
      expect(api.access).toHaveBeenCalledWith(403);
      expect(result.current.state.canManage).toBe(false);
    });
    it("does not retry a committed save when the authoritative list is unavailable", async () => {
      api.save.mockResolvedValue({
        committed: true,
        refresh: { ok: false, status: 503, message: "offline" },
      });
      const { result } = await ready();
      act(() => result.current.actions.updateUserStatus("u1", "active"));
      await act(async () => {
        await result.current.actions.save();
      });
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(result.current.state.canManage).toBe(false);
      expect(result.current.state.success).toBeTruthy();
      await act(async () => {
        await result.current.actions.load();
      });
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(result.current.state.canManage).toBe(true);
    });
    it("rejects late save results after a session switch", async () => {
      let resolve!: (value: unknown) => void;
      api.save.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      const { result, rerender } = await ready();
      act(() => result.current.actions.updateUserStatus("u1", "active"));
      act(() => {
        void result.current.actions.save();
      });
      rerender({ version: 2 });
      await act(async () =>
        resolve({ committed: true, refresh: { ok: true, data: list } }),
      );
      expect(result.current.state.success).toBeNull();
      expect(api.access).not.toHaveBeenCalled();
    });
  });
