import { NextResponse, type NextRequest } from "next/server";
import { wikiResourceTypeSchema } from "@kpool/wiki";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { isAccountActive } from "@/gateways/identity/identityApi";
import {
  getWikiVideoLikePermissions,
  getCurrentWikiPrincipalForRequest,
} from "@/gateways/wiki/wikiPrincipal";
export async function GET(request: NextRequest) {
  const respond = (
    permissions = { canLike: false, canUnlike: false },
    principalIdentifier: string | null = null,
    status = 200,
  ) =>
    NextResponse.json(
      { ...permissions, principalIdentifier },
      { status, headers: { "Cache-Control": "private, no-store" } },
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
  if (state.status === "error") return respond(undefined, null, 503);
  if (
    state.status !== "available" ||
    state.principal.status !== "active" ||
    state.principal.identityIdentifier !== identity.identityIdentifier
  )
    return respond();
  return respond(
    getWikiVideoLikePermissions(state.principal, resource.data),
    state.principal.principalIdentifier,
  );
}
