"use client";

import {
  fetchSiteManagementPrincipalGroups,
  saveSiteManagementPrincipalGroups,
  type SiteManagementAccessRefresh,
  type SiteManagementPrincipalGroupList,
} from "@/gateways/site-management/siteManagementPrincipalGroups";
import { adminQueryKeys } from "../../queryKeys";
import { usePrincipalGroupEditor } from "../../principal-groups/usePrincipalGroupEditor";
import type { SiteManagementDictionary } from "./types";
const adapt = (data: SiteManagementPrincipalGroupList) => ({
  groups: data.principalGroups,
  users: data.principals,
});
export function useSiteManagementPrincipalGroups({
  accountIdentifier,
  actorIdentifier,
  sessionVersion,
  canManage,
  refreshAccess,
  t,
}: {
  accountIdentifier: string | null;
  actorIdentifier: string | null;
  sessionVersion: number;
  canManage: boolean;
  t: SiteManagementDictionary;
  refreshAccess: SiteManagementAccessRefresh;
}) {
  return usePrincipalGroupEditor({
    scope: JSON.stringify([
      accountIdentifier,
      actorIdentifier,
      sessionVersion,
      canManage,
    ]),
    queryKey: [
      ...adminQueryKeys.siteManagement.principalGroups(
        accountIdentifier,
        actorIdentifier,
      ),
      sessionVersion,
    ],
    enabled: canManage && Boolean(accountIdentifier && actorIdentifier),
    fetchList: async () => adapt(await fetchSiteManagementPrincipalGroups()),
    saveList: async (payload) => {
      const result = await saveSiteManagementPrincipalGroups(payload);
      return {
        ...result,
        refresh: result.refresh.ok
          ? { ok: true as const, data: adapt(result.refresh.data) }
          : result.refresh,
      };
    },
    refreshAccess,
    t: {
      ...t,
      lastManager: t.principalStatus.lastManager,
      forbiddenChange: t.principalStatus.forbiddenChange,
    },
  });
}
