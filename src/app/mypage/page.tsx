import { cookies } from "next/headers";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import {
  createInitialDraftWikis,
  loadInitialDraftWikisForRequest,
} from "@/gateways/wiki/draftWiki";
import {
  getInitialWikiPrincipalForRequest,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import { MyPageClient } from "./MyPageClient";

export const dynamic = "force-dynamic";

const getPrincipalStateKey = (
  principalState: Extract<WikiPrincipalState, { status: "available" | "missing" | "error" | "idle" }>,
): string => {
  if (principalState.status === "available") {
    return `available:${principalState.principal.principalIdentifier}`;
  }

  return principalState.status;
};

export default async function MyPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader,
  });
  const principalState = await getInitialWikiPrincipalForRequest({
    cookieHeader,
    hasAuthenticatedIdentity: Boolean(authenticatedIdentity),
  });
  const initialDraftWikis = principalState.status === "available"
    ? await loadInitialDraftWikisForRequest(cookieHeader)
    : createInitialDraftWikis();

  return (
    <MyPageClient
      key={getPrincipalStateKey(principalState)}
      initialDraftWikis={initialDraftWikis}
      initialIdentity={authenticatedIdentity}
      initialPrincipalState={principalState}
    />
  );
}
