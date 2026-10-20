import { cookies } from "next/headers";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { isAccountActive } from "@/gateways/identity/identityApi";
import { getCurrentWikiPrincipalForRequest } from "@/gateways/wiki/wikiPrincipal";

export const loadWikiEditAccess = async (returnPath: string) => {
  const cookieHeader = (await cookies()).toString();
  const identity = await fetchAuthenticatedIdentity({ cookieHeader });
  const destination = encodeURIComponent(returnPath);

  if (!identity) return { status: "redirect" as const, href: `/login?returnTo=${destination}` };
  if (!isAccountActive(identity)) return { status: "redirect" as const, href: `/admin?authReturnTo=${destination}` };

  const principal = await getCurrentWikiPrincipalForRequest({ cookieHeader });
  if (principal.status === "missing") return { status: "redirect" as const, href: `/admin?returnTo=${destination}` };
  if (principal.status === "error") return { status: "error" as const, message: principal.message, httpStatus: principal.httpStatus, body: principal.body };

  return { status: "available" as const, identity, headers: cookieHeader ? { Cookie: cookieHeader } : undefined };
};
