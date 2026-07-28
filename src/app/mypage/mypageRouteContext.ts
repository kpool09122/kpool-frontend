import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import {
  createInitialDraftWikis,
  loadInitialDraftWikisForRequest,
} from "@/gateways/wiki/draftWiki";
import { getInitialWikiPrincipalForRequest } from "@/gateways/wiki/wikiPrincipal";

export const dynamic = "force-dynamic";

export async function loadMypageRouteContext(loginReturnTo: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader,
  });

  if (!authenticatedIdentity) {
    redirect(`/login?returnTo=${encodeURIComponent(loginReturnTo)}`);
  }

  const principalState = await getInitialWikiPrincipalForRequest({
    cookieHeader,
    hasAuthenticatedIdentity: true,
  });
  const initialDraftWikis = principalState.status === "available"
    ? await loadInitialDraftWikisForRequest(cookieHeader)
    : createInitialDraftWikis();

  return {
    initialDraftWikis,
    initialIdentity: authenticatedIdentity,
    initialPrincipalState: principalState,
  };
}
