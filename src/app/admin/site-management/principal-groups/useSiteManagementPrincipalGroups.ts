"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchSiteManagementPrincipalGroups, saveSiteManagementPrincipalGroups, type SiteManagementAccessRefresh } from "@/gateways/site-management/siteManagementPrincipalGroups";
import { adminQueryKeys } from "../../queryKeys";
import { areSiteManagementMembershipsEqual, updateSiteManagementUserGroups } from "./membershipModel";
import type { SiteManagementDictionary, SiteManagementMemberships, SiteManagementPrincipalGroupState } from "./types";

const messageOf = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

const statusOf = (error: unknown) => error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : null;

export function useSiteManagementPrincipalGroups({ accountIdentifier, actorIdentifier, sessionVersion, canManage, refreshAccess, t }: {
  accountIdentifier: string | null; actorIdentifier: string | null; sessionVersion: number; canManage: boolean; t: SiteManagementDictionary;
  /** null means unconfirmed, false means confirmed no management access. */
  refreshAccess: SiteManagementAccessRefresh;
}) {
  const scope = JSON.stringify([accountIdentifier, actorIdentifier, sessionVersion, canManage]);
  const active = useRef<{ valid: boolean; busy: boolean } | null>(null);
  useEffect(() => { const token = { valid: true, busy: false }; active.current = token; return () => { token.valid = false; }; }, [scope]);
  const client = useQueryClient();
  const key = [...adminQueryKeys.siteManagement.principalGroups(accountIdentifier, actorIdentifier), sessionVersion];
  const [draft, setDraft] = useState<{ scope: string; memberships: SiteManagementMemberships; baseline: SiteManagementMemberships } | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "refreshing" | "pending" | "denied">("idle");
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) { setPreviousScope(scope); setDraft(null); setSaveError(null); setRefreshError(null); setCommitted(false); setPhase("idle"); }
  const query = useQuery({ queryKey: key, queryFn: () => fetchSiteManagementPrincipalGroups(), enabled: canManage && Boolean(accountIdentifier && actorIdentifier), retry: false, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const data = canManage ? query.data : undefined;
  const groups = data?.principalGroups ?? [];
  const saved: SiteManagementMemberships = Object.fromEntries(groups.map((group) => [group.principalGroupIdentifier, group.members.map((member) => member.principalIdentifier)]));
  const memberships = draft?.scope === scope ? draft.memberships : saved;
  const hasUnsavedChanges = !areSiteManagementMembershipsEqual(saved, memberships);
  const editable = canManage && phase === "idle" && !query.isFetching && !query.isError;
  const pending = phase === "pending";
  const state: SiteManagementPrincipalGroupState = {
    users: data?.principals ?? [], groups, membershipByGroup: memberships, canManage: canManage && phase === "idle",
    hasUnsavedChanges, isLoading: canManage && (query.isFetching || phase === "refreshing"), isSaving: phase === "saving",
    loadError: query.isError ? messageOf(query.error, t.loadFailed) : refreshError ?? (pending && !committed ? t.loadFailed : null), saveError,
    success: committed ? (phase === "idle" ? t.saved : t.savedRefreshFailed) : null,
    canRetryRefresh: pending,
  };
  const confirmAccess = (token: { valid: boolean; busy: boolean }, listOk: boolean, status?: number | null) =>
    refreshAccess(status).then((allowed) => {
      if (!token.valid) return;
      setPhase(allowed === false ? "denied" : allowed === true && listOk ? "idle" : "pending");
    }, () => { if (token.valid) setPhase("pending"); });
  const actions = {
    updateUserGroups: (principalIdentifier: string, groupIdentifiers: string[]) => {
      if (!editable || active.current?.busy || !data?.principals.some((user) => user.principalIdentifier === principalIdentifier)) return;
      setDraft({ scope, baseline: draft?.scope === scope ? draft.baseline : saved, memberships: updateSiteManagementUserGroups(memberships, groups, principalIdentifier, groupIdentifiers) });
      setSaveError(null); setCommitted(false);
    },
    save: async () => {
      const token = active.current;
      if (!editable || !hasUnsavedChanges || !token?.valid || token.busy) return;
      token.busy = true; setPhase("saving"); setSaveError(null); setRefreshError(null); setCommitted(false);
      await saveSiteManagementPrincipalGroups({ principalGroups: groups.map((group) => ({ principalGroupIdentifier: group.principalGroupIdentifier, principalIdentifiers: [...(memberships[group.principalGroupIdentifier] ?? [])] })) }).then(async (result) => {
        if (!token.valid) return;
        setCommitted(true); setDraft(null); setPhase("refreshing");
        if (result.refresh.ok) client.setQueryData(key, result.refresh.data);
        else {
          setRefreshError(result.refresh.message);
          void client.invalidateQueries({ queryKey: key, exact: true, refetchType: "none" });
        }
        await confirmAccess(token, result.refresh.ok, result.refresh.ok ? null : result.refresh.status);
      }, async (error: unknown) => {
        if (!token.valid) return;
        const status = statusOf(error);
        setSaveError(messageOf(error, t.saveFailed));
        if (status === 401 || status === 403) { setPhase("refreshing"); await confirmAccess(token, false, status); }
        else setPhase("idle");
      });
      token.busy = false;
    },
    load: async () => {
      const token = active.current;
      if (!canManage || (hasUnsavedChanges && !pending) || !token?.valid || token.busy || query.isFetching || phase === "denied") return;
      token.busy = true; setSaveError(null); setRefreshError(null); setPhase("refreshing");
      await fetchSiteManagementPrincipalGroups().then(async (latest) => {
        if (!token.valid) return;
        const baseline = Object.fromEntries(latest.principalGroups.map((group) => [group.principalGroupIdentifier, group.members.map((member) => member.principalIdentifier)]));
        // Reapply only local additions/removals, never old unedited server memberships.
        setDraft((current) => {
          if (!current || current.scope !== scope) return current;
          const memberships = Object.fromEntries(Object.entries(baseline).map(([id, members]) => {
            const before = current.baseline[id] ?? [];
            const edited = current.memberships[id] ?? before;
            const removed = new Set(before.filter((member) => !edited.includes(member)));
            const added = edited.filter((member) => !before.includes(member));
            return [id, [...new Set([...members.filter((member) => !removed.has(member)), ...added])]];
          }));
          return { scope, baseline, memberships };
        });
        client.setQueryData(key, latest);
        await confirmAccess(token, true);
      }, async (error: unknown) => {
        if (!token.valid) return;
        setRefreshError(messageOf(error, t.loadFailed));
        await confirmAccess(token, false, statusOf(error));
      });
      token.busy = false;
    },
  };
  return { state, actions, accessStatus: statusOf(query.error) };
}
