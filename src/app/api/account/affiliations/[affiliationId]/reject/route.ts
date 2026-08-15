import { NextResponse, type NextRequest } from "next/server";

import { getAccountApiBaseUrl } from "@/gateways/account/accountApi";
import { accountApiUnavailableResponse, getAccountRouteErrorMessage, getForwardHeaders, readResponseBody } from "../../../routeSupport";

type RouteContext = { params: Promise<{ affiliationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  const { affiliationId } = await context.params;
  try {
    const apiResponse = await fetch(`${baseUrl}/affiliations/${encodeURIComponent(affiliationId)}/reject`, {
      method: "POST",
      headers: getForwardHeaders(request, false),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, responseBody) }, { status: apiResponse.status });
    return new Response(null, { status: apiResponse.status });
  } catch {
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}
