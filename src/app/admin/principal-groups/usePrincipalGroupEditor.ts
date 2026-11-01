"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type {
  PrincipalAccessRefresh,
  PrincipalGroupTransport,
} from "@/gateways/support/principalGroupSave";
import type {
  PrincipalStatus,
  PrincipalStatusUpdate,
} from "@/gateways/identity/principalStatus";

type Memberships = Readonly<Record<string, readonly string[]>>;
type User = { principalIdentifier: string; status: PrincipalStatus };
type Group = {
  isMembershipEditable?: boolean;
  principalGroupIdentifier: string;
  members: readonly { principalIdentifier: string }[];
};
type List<G, U> = { groups: G[]; users: U[] };
type Payload = {
  principalGroups: {
    principalGroupIdentifier: string;
    principalIdentifiers: string[];
  }[];
  principalStatuses: PrincipalStatusUpdate[];
};
type Draft = {
  scope: string;
  memberships: Memberships;
  baseline: Memberships;
  statuses: Record<string, PrincipalStatus>;
  baselineStatuses: Record<string, PrincipalStatus>;
};
const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
export const principalErrorStatus = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "status" in error &&
  typeof error.status === "number"
    ? error.status
    : null;
const codeOf = (error: unknown) =>
  error && typeof error === "object" && "code" in error ? error.code : null;
const equalMemberships = (a: Memberships, b: Memberships) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(
    ([id, members]) =>
      members.length === b[id]?.length &&
      members.every((member) => b[id].includes(member)),
  );

/** One scoped page draft for membership and lifecycle. Never retry a committed PATCH. */
export function usePrincipalGroupEditor<G extends Group, U extends User>({
  scope,
  queryKey,
  enabled,
  fetchList,
  saveList,
  refreshAccess,
  t,
}: {
  scope: string;
  queryKey: readonly unknown[];
  enabled: boolean;
  refreshAccess: PrincipalAccessRefresh;
  t: {
    loadFailed: string;
    saveFailed: string;
    saved: string;
    savedRefreshFailed: string;
    lastManager: string;
    forbiddenChange: string;
  };
} & PrincipalGroupTransport<G, U, Payload>) {
  const active = useRef<{ valid: boolean; busy: boolean } | null>(null);
  useEffect(() => {
    const token = { valid: true, busy: false };
    active.current = token;
    return () => {
      token.valid = false;
    };
  }, [scope]);
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "saving" | "refreshing" | "pending" | "denied"
  >("idle");
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setDraft(null);
    setSaveError(null);
    setRefreshError(null);
    setCommitted(false);
    setPhase("idle");
  }
  const query = useQuery({
    queryKey,
    queryFn: () => {
      const token = active.current;
      return fetchList().catch((error: unknown) => {
        const status = principalErrorStatus(error);
        if (token?.valid && active.current === token && (status === 401 || status === 403)) {
          void refreshAccess(status).catch(() => null);
        }
        return Promise.reject(error);
      });
    },
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const data = enabled ? query.data : undefined;
  const groups = data?.groups ?? [];
  const users = data?.users ?? [];
  const saved: Memberships = Object.fromEntries(
    groups.map((group) => [
      group.principalGroupIdentifier,
      group.members.map((member) => member.principalIdentifier),
    ]),
  );
  const savedStatuses = Object.fromEntries(
    users.map((user) => [user.principalIdentifier, user.status]),
  );
  const currentDraft = draft?.scope === scope ? draft : null;
  const memberships = currentDraft?.memberships ?? saved;
  const statuses = currentDraft?.statuses ?? savedStatuses;
  const hasUnsavedChanges =
    !equalMemberships(saved, memberships) ||
    users.some((user) => statuses[user.principalIdentifier] !== user.status);
  const editable =
    enabled && phase === "idle" && !query.isFetching && !query.isError;
  const pending = phase === "pending";
  const state = {
    users: users.map((user) => ({
      ...user,
      status: statuses[user.principalIdentifier],
    })),
    groups,
    membershipByGroup: memberships,
    canManage: editable,
    hasUnsavedChanges,
    isLoading: enabled && (query.isFetching || phase === "refreshing"),
    isSaving: phase === "saving",
    loadError: query.isError
      ? messageOf(query.error, t.loadFailed)
      : (refreshError ?? (pending && !committed ? t.loadFailed : null)),
    saveError,
    success: committed
      ? phase === "idle"
        ? t.saved
        : t.savedRefreshFailed
      : null,
    canRetryRefresh: pending,
  };
  const confirmAccess = (
    token: { valid: boolean },
    listOk: boolean,
    status?: number | null,
  ) =>
    refreshAccess(status).then(
      (allowed) => {
        if (token.valid)
          setPhase(
            allowed === false
              ? "denied"
              : allowed === true && listOk
                ? "idle"
                : "pending",
          );
      },
      () => {
        if (token.valid) setPhase("pending");
      },
    );
  const rebase = (latest: List<G, U>) => {
    const baseline = Object.fromEntries(
      latest.groups.map((group) => [
        group.principalGroupIdentifier,
        group.members.map((member) => member.principalIdentifier),
      ]),
    );
    const baselineStatuses = Object.fromEntries(
      latest.users.map((user) => [user.principalIdentifier, user.status]),
    );
    setDraft((current) => {
      if (!current || current.scope !== scope) return current;
      const validUsers = new Set(
        latest.users.map((user) => user.principalIdentifier),
      );
      const memberships = Object.fromEntries(
        Object.entries(baseline).map(([id, members]) => {
          if (latest.groups.find((group) => group.principalGroupIdentifier === id)?.isMembershipEditable === false) {
            return [id, members];
          }
          const before = current.baseline[id] ?? [];
          const edited = current.memberships[id] ?? before;
          const removed = new Set(
            before.filter((member) => !edited.includes(member)),
          );
          const added = edited.filter(
            (member) => !before.includes(member) && validUsers.has(member),
          );
          return [
            id,
            [
              ...new Set([
                ...members.filter((member) => !removed.has(member)),
                ...added,
              ]),
            ],
          ];
        }),
      );
      const statuses = Object.fromEntries(
        latest.users.map((user) => [
          user.principalIdentifier,
          user.status === "forced_stop"
            ? user.status
            : current.statuses[user.principalIdentifier] &&
                current.statuses[user.principalIdentifier] !==
                  current.baselineStatuses[user.principalIdentifier]
              ? current.statuses[user.principalIdentifier]
              : user.status,
        ]),
      );
      return { scope, baseline, baselineStatuses, memberships, statuses };
    });
    client.setQueryData(queryKey, latest);
  };
  const load = async () => {
    const token = active.current;
    if (
      !enabled ||
      (hasUnsavedChanges && !pending) ||
      !token?.valid ||
      token.busy ||
      query.isFetching ||
      phase === "denied"
    )
      return;
    token.busy = true;
    setRefreshError(null);
    setPhase("refreshing");
    await fetchList().then(
      async (latest) => {
        if (!token.valid) return;
        rebase(latest);
        await confirmAccess(token, true);
      },
      async (error: unknown) => {
        if (!token.valid) return;
        setRefreshError(messageOf(error, t.loadFailed));
        await confirmAccess(token, false, principalErrorStatus(error));
      },
    );
    token.busy = false;
  };
  const edit = (change: (current: Draft) => Draft) => {
    if (!editable || active.current?.busy) return;
    setDraft((current) =>
      change(
        current?.scope === scope
          ? current
          : {
              scope,
              baseline: saved,
              memberships: saved,
              statuses: savedStatuses,
              baselineStatuses: savedStatuses,
            },
      ),
    );
    setSaveError(null);
    setCommitted(false);
  };
  const actions = {
    updateUserGroups: (
      principalIdentifier: string,
      groupIdentifiers: string[],
    ) => {
      if (
        !users.some((user) => user.principalIdentifier === principalIdentifier)
      )
        return;
      const selected = new Set(groupIdentifiers);
      edit((current) => ({
        ...current,
        memberships: Object.fromEntries(
          Object.entries(current.memberships).map(([id, members]) => [
            id,
            groups.find((group) => group.principalGroupIdentifier === id)?.isMembershipEditable === false
              ? members
              : selected.has(id)
                ? [...new Set([...members, principalIdentifier])]
                : members.filter((member) => member !== principalIdentifier),
          ]),
        ),
      }));
    },
    updateUserStatus: (
      principalIdentifier: string,
      status: "active" | "suspended",
    ) => {
      if (
        !users.some(
          (user) =>
            user.principalIdentifier === principalIdentifier &&
            user.status !== "forced_stop",
        ) ||
        !["active", "suspended"].includes(status)
      )
        return;
      edit((current) => ({
        ...current,
        statuses: { ...current.statuses, [principalIdentifier]: status },
      }));
    },
    save: async () => {
      const token = active.current;
      if (!editable || !hasUnsavedChanges || !token?.valid || token.busy)
        return;
      token.busy = true;
      setPhase("saving");
      setSaveError(null);
      setRefreshError(null);
      setCommitted(false);
      await saveList({
        principalGroups: groups.filter((group) => group.isMembershipEditable !== false).map((group) => ({
          principalGroupIdentifier: group.principalGroupIdentifier,
          principalIdentifiers: [
            ...(memberships[group.principalGroupIdentifier] ?? []),
          ],
        })),
        principalStatuses: users.map((user) => ({
          principalIdentifier: user.principalIdentifier,
          status: statuses[user.principalIdentifier],
        })),
      }).then(
        async (result) => {
          if (!token.valid) return;
          setCommitted(true);
          setDraft(null);
          setPhase("refreshing");
          if (result.refresh.ok)
            client.setQueryData(queryKey, result.refresh.data);
          else {
            setRefreshError(result.refresh.message);
            void client.invalidateQueries({
              queryKey,
              exact: true,
              refetchType: "none",
            });
          }
          await confirmAccess(
            token,
            result.refresh.ok,
            result.refresh.ok ? null : result.refresh.status,
          );
        },
        async (error: unknown) => {
          if (!token.valid) return;
          const status = principalErrorStatus(error);
          const code = codeOf(error);
          setSaveError(
            code === "last_active_manager"
              ? t.lastManager
              : code === "principal_status_change_forbidden"
                ? t.forbiddenChange
                : messageOf(error, t.saveFailed),
          );
          if (status === 409) {
            setPhase("refreshing");
            await fetchList().then(
              async (latest) => {
                if (!token.valid) return;
                rebase(latest);
                await confirmAccess(token, true);
              },
              async () => {
                if (token.valid) await confirmAccess(token, false);
              },
            );
          } else if (status === 401 || status === 403) {
            setPhase("refreshing");
            await confirmAccess(token, false, status);
          } else setPhase("idle");
        },
      );
      token.busy = false;
    },
    load,
  };
  return { state, actions, accessStatus: principalErrorStatus(query.error) };
}
