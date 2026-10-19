import { cache } from "react";
import { cookies } from "next/headers";
import { isAccountActive } from "@/gateways/identity/identityApi";
import { getInitialWikiPrincipalForRequest, type WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import { loadAdminIdentity } from "./adminIdentity";

/** Share one timestamped snapshot between the layout, navigation and route data. */
export const loadAdminWikiPrincipalSnapshot = cache(async () => {
  const identity = await loadAdminIdentity();
  let state: WikiPrincipalState = { status: "idle" };
  if (identity && isAccountActive(identity)
    && identity.accountPrincipalStatus !== "suspended" && identity.accountPrincipalStatus !== "forced_stop") {
    const cookieStore = await cookies();
    state = await getInitialWikiPrincipalForRequest({ cookieHeader: cookieStore.toString(), hasAuthenticatedIdentity: true });
  }
  return { state, updatedAt: Date.now() };
});

export const loadAdminWikiPrincipal = async () => (await loadAdminWikiPrincipalSnapshot()).state;
