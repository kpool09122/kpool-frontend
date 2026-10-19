"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { canShowSiteManagementPrincipalGroupManagement } from "../../principalGroupVisibility";
import { useAdmin } from "../../AdminProvider";
import { SiteManagementPrincipalGroupManagementPanel } from "./SiteManagementPrincipalGroupManagementPanel";
import { useSiteManagementPrincipalGroups } from "./useSiteManagementPrincipalGroups";

const actorOf = (identity: AuthenticatedIdentitySummary) => JSON.stringify([identity.identityIdentifier, identity.siteManagementPrincipalIdentifier, identity.delegationIdentifier]);

export function SiteManagementPrincipalGroupsClient() {
  const { currentIdentity, refreshIdentity, t } = useAdmin();
  const router = useRouter();
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const canManage = canShowSiteManagementPrincipalGroupManagement(currentIdentity);
  const accountIdentifier = currentIdentity.accountIdentifier ?? null;
  const actorIdentifier = actorOf(currentIdentity);
  const refreshAccess = useCallback(async (status?: number | null) => {
    const initial = useAuthStore.getState();
    const bootstrapping = sessionVersion === 0 && initial.identity === null && initial.status === "loading";
    const isCurrent = () => {
      const store = useAuthStore.getState();
      const identity = store.identity ?? (store.status === "loading" && store.sessionVersion === 0 ? currentIdentity : null);
      return mounted.current && (store.sessionVersion === sessionVersion || (bootstrapping && store.sessionVersion === 1)) && identity?.accountIdentifier === accountIdentifier && actorOf(identity) === actorIdentifier;
    };
    if (!isCurrent()) return null;
    const identity = await refreshIdentity({ preserveOnNull: true });
    if (!identity || !isCurrent() || identity.accountIdentifier !== accountIdentifier || actorOf(identity) !== actorIdentifier) return null;
    const allowed = canShowSiteManagementPrincipalGroupManagement(identity);
    if (status === 401) router.replace("/login?returnTo=%2Fadmin%2Fsite-management%2Fprincipal-groups");
    return allowed;
  }, [accountIdentifier, actorIdentifier, currentIdentity, refreshIdentity, router, sessionVersion]);
  const { state, actions } = useSiteManagementPrincipalGroups({ accountIdentifier, actorIdentifier, sessionVersion, canManage, refreshAccess, t: t.siteManagementPrincipalGroups });
  if (!canManage) return null;
  return <SiteManagementPrincipalGroupManagementPanel state={state} actions={actions} t={t.siteManagementPrincipalGroups} />;
}
