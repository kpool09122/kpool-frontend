"use client";
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { useAuthStore } from "@/gateways/auth/authStore";
import { canManagePrincipalGroups } from "@/gateways/account/accountPolicy";
import { canManageSiteManagementPrincipalGroups } from "@/gateways/site-management/siteManagementPolicy";
import {
  getCurrentWikiPrincipal,
  canManageWikiPrincipalGroups,
} from "@/gateways/wiki/wikiPrincipal";
import { useAdmin } from "../AdminProvider";
import { adminQueryKeys } from "../queryKeys";

export function usePrincipalAccess(
  context: "account" | "wiki" | "site-management",
) {
  const { currentIdentity, refreshIdentity } = useAdmin();
  const client = useQueryClient();
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);
  const actorIdentifier = JSON.stringify([
    currentIdentity.identityIdentifier,
    currentIdentity.accountPrincipalIdentifier,
    currentIdentity.siteManagementPrincipalIdentifier,
    currentIdentity.delegationIdentifier,
  ]);
  const refreshAccess = useCallback(async () => {
    const initial = useAuthStore.getState();
    const bootstrapping =
      sessionVersion === 0 &&
      initial.identity === null &&
      initial.status === "loading";
    const isCurrent = () => {
      const state = useAuthStore.getState();
      const identity =
        state.identity ??
        (state.status === "loading" && state.sessionVersion === 0
          ? currentIdentity
          : null);
      return (
        mounted.current &&
        (state.sessionVersion === sessionVersion ||
          (bootstrapping && state.sessionVersion === 1)) &&
        identity?.identityIdentifier === currentIdentity.identityIdentifier &&
        identity != null &&
        getAccountIdentifierFromIdentity(identity) === accountIdentifier &&
        identity?.delegationIdentifier === currentIdentity.delegationIdentifier
      );
    };
    if (!isCurrent()) return null;
    const identity = await refreshIdentity({ preserveOnNull: true });
    if (!identity || !isCurrent()) return null;
    if (context === "account") return canManagePrincipalGroups(identity);
    if (context === "site-management")
      return canManageSiteManagementPrincipalGroups(identity);
    const principal = await getCurrentWikiPrincipal();
    if (!isCurrent()) return null;
    client.setQueryData(
      adminQueryKeys.principal.current(
        identity.identityIdentifier,
        accountIdentifier,
      ),
      principal,
    );
    if (principal.status === "error") return null;
    return (
      identity.accountPrincipalStatus === "active" &&
      principal.status === "available" &&
      canManageWikiPrincipalGroups(principal.principal)
    );
  }, [
    accountIdentifier,
    client,
    context,
    currentIdentity,
    refreshIdentity,
    sessionVersion,
  ]);
  return { accountIdentifier, actorIdentifier, sessionVersion, refreshAccess };
}
