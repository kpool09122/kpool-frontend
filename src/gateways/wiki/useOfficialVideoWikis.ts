"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchOfficialVideoWikis } from "./officialVideoInbox";
export function useOfficialVideoWikis() {
  const { status, identity, sessionVersion, refreshIdentity } = useAuthStore();
  const needsAuthentication =
    status === "loading" && sessionVersion === 0 && !identity;
  useEffect(() => {
    if (needsAuthentication) void refreshIdentity();
  }, [needsAuthentication, refreshIdentity]);
  const scope = [
    status,
    identity?.identityIdentifier,
    identity?.accountIdentifier,
    identity?.accountPrincipalIdentifier,
    sessionVersion,
  ].join(":");
  const enabled = status === "authenticated" && !identity?.delegationIdentifier;
  const query = useQuery({
    queryKey: ["official-video-wikis", scope],
    queryFn: ({ signal }) => fetchOfficialVideoWikis(signal),
    enabled,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  return { query, scope, enabled, checkingIdentity: status === "loading" };
}
