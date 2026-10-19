"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { getCurrentWikiPrincipal, type WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { adminQueryKeys } from "./queryKeys";

/** Read the shared snapshot; explicit refreshes use the same query key. */
export function useWikiPrincipalState(identity: IdentitySummary | null, initialState?: WikiPrincipalState, updatedAt?: number): WikiPrincipalState {
  const { data } = useQuery({
    queryKey: adminQueryKeys.principal.current(identity?.identityIdentifier ?? null, getAccountIdentifierFromIdentity(identity)),
    queryFn: () => getCurrentWikiPrincipal(),
    initialData: initialState,
    initialDataUpdatedAt: updatedAt,
    enabled: false,
  });
  return data ?? { status: "idle" };
}
