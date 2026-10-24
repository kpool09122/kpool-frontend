import { NextResponse, type NextRequest } from "next/server";
import { wikiResourceTypeSchema } from "@kpool/wiki";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { isAccountActive } from "@/gateways/identity/identityApi";
import {
  canCreateWikiVideo,
  getCurrentWikiPrincipalForRequest,
} from "@/gateways/wiki/wikiPrincipal";

export async function GET(request: NextRequest) {
  const respond = (canCreate: boolean) =>
    NextResponse.json(
      { canCreate },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  const resource = wikiResourceTypeSchema.safeParse(
    request.nextUrl.searchParams.get("resourceType"),
  );
  if (!resource.success) return respond(false);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const identity = await fetchAuthenticatedIdentity({ cookieHeader });
  if (
    !identity ||
    !isAccountActive(identity) ||
    identity.accountPrincipalStatus !== "active"
  )
    return respond(false);
  const state = await getCurrentWikiPrincipalForRequest({ cookieHeader });
  return respond(
    state.status === "available" &&
      canCreateWikiVideo(state.principal, resource.data),
  );
}
