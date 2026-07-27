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

type MyPageSettingsTab = "profileSettings" | "languageSettings";
type MyPageAccountSettingsTab = "accountProfile" | "accountInvitations" | "principalGroupManagement";
type MyPageSection = "wiki" | "accountSettings" | "settings";
type MyPageWikiTab = "approvedWikis" | "draftImages" | "editingWikis" | "imageDeletionRequests" | "submittedWikis" | "unapprovedWikis" | "untranslatedWikis";

export type MypageRouteConfig = {
  loginReturnTo: string;
  returnTo?: string | null;
  section: MyPageSection;
  wikiTab?: MyPageWikiTab;
  accountSettingsTab?: MyPageAccountSettingsTab;
  settingsTab?: MyPageSettingsTab;
};

const getPrincipalStateKey = (
  principalState: Extract<WikiPrincipalState, { status: "available" | "missing" | "error" | "idle" }>,
): string => {
  if (principalState.status === "available") {
    return `available:${principalState.principal.principalIdentifier}`;
  }

  return principalState.status;
};

export async function MypageRoutePage({
  accountSettingsTab = "accountProfile",
  loginReturnTo,
  returnTo = null,
  section,
  settingsTab = "profileSettings",
  wikiTab = "editingWikis",
}: MypageRouteConfig) {
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
    hasAuthenticatedIdentity: Boolean(authenticatedIdentity),
  });
  const initialDraftWikis = principalState.status === "available"
    ? await loadInitialDraftWikisForRequest(cookieHeader)
    : createInitialDraftWikis();

  return (
    <MyPageClient
      key={getPrincipalStateKey(principalState)}
      initialAccountSettingsTab={accountSettingsTab}
      initialDraftWikis={initialDraftWikis}
      initialIdentity={authenticatedIdentity}
      initialPrincipalState={principalState}
      initialSection={section}
      initialSettingsTab={settingsTab}
      initialWikiTab={wikiTab}
      returnTo={returnTo}
    />
  );
}
