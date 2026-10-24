import { NextResponse, type NextRequest } from "next/server";
import { wikiResourceTypeSchema } from "@kpool/wiki";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { isAccountActive } from "@/gateways/identity/identityApi";
import {
  canDeleteWikiVideo,
  getCurrentWikiPrincipalForRequest,
} from "@/gateways/wiki/wikiPrincipal";

export async function GET(request: NextRequest) {
  const respond = (principalIdentifier: string | null = null) =>
    NextResponse.json(
      { canDelete: principalIdentifier !== null, principalIdentifier },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  const resource = wikiResourceTypeSchema.safeParse(
    request.nextUrl.searchParams.get("resourceType"),
  );
  if (!resource.success) return respond();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const identity = await fetchAuthenticatedIdentity({ cookieHeader });
  if (
    !identity ||
    !isAccountActive(identity) ||
    identity.accountPrincipalStatus !== "active"
  )
    return respond();
  const state = await getCurrentWikiPrincipalForRequest({ cookieHeader });
  return respond(
    state.status === "available" &&
      state.principal.identityIdentifier === identity.identityIdentifier &&
      canDeleteWikiVideo(state.principal, resource.data)
      ? state.principal.principalIdentifier
      : null,
  );
}
