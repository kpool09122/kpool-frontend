"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { isAccountActive, type AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { getMonetizationPrincipal } from "@/gateways/monetization/monetizationPrincipal";
import { getAdminActorIdentifier } from "../accountScope";
import { adminQueryKeys } from "../queryKeys";

/** Share the same access snapshot between the sidebar and settings workspace. */
export function useMonetizationPrincipal(identity: AuthenticatedIdentitySummary, sessionVersion: number) {
  return useQuery({
    queryKey: adminQueryKeys.monetization.principal(
      getAccountIdentifierFromIdentity(identity),
      getAdminActorIdentifier(identity),
      sessionVersion,
    ),
    queryFn: ({ signal }) => getMonetizationPrincipal({ signal }),
    enabled: isAccountActive(identity)
      && identity.accountPrincipalStatus !== "suspended"
      && identity.accountPrincipalStatus !== "forced_stop",
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
