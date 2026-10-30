"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { fetchOfficialVideoWikis } from "./officialVideoInbox";
export function useOfficialVideoWikis({ active = true, initialIdentity = null }: {
  active?: boolean;
  initialIdentity?: AuthenticatedIdentitySummary | null;
} = {}) {
  const { status, identity, sessionVersion, refreshIdentity } = useAuthStore();
  const needsAuthentication =
    status === "loading" && sessionVersion === 0 && !identity;
  useEffect(() => {
    if (active && needsAuthentication && !initialIdentity) void refreshIdentity();
  }, [active, needsAuthentication, initialIdentity, refreshIdentity]);
  const currentIdentity = identity ?? (needsAuthentication ? initialIdentity : null);
  const authenticated = status === "authenticated" || (needsAuthentication && !!initialIdentity);
  const scope = [
    authenticated ? "authenticated" : status,
    currentIdentity?.identityIdentifier,
    currentIdentity?.accountIdentifier,
    currentIdentity?.accountPrincipalIdentifier,
    sessionVersion,
  ].join(":");
  const enabled = active && authenticated && !currentIdentity?.delegationIdentifier;
  const query = useQuery({
    queryKey: ["official-video-wikis", scope],
    queryFn: ({ signal }) => fetchOfficialVideoWikis(signal),
    enabled,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const canViewOfficialVideoInbox = enabled && query.isSuccess && query.data.wikis.length > 0;
  return { query, scope, enabled, checkingIdentity: status === "loading" && !currentIdentity, canViewOfficialVideoInbox };
}
