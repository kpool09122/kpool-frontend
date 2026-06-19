import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

type MyPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalReturnTo = (value: string | undefined): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

export default async function MyPage({ searchParams }: MyPageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = normalizeOptionalReturnTo(
    getSingleSearchParam(resolvedSearchParams.returnTo),
  );
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader,
  });

  if (!authenticatedIdentity) {
    redirect("/login?returnTo=/mypage");
  }

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
      returnTo={returnTo}
    />
  );
}
