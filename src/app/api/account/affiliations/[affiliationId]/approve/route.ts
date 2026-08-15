import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAccountApiBaseUrl, parseAffiliationSummary } from "@/gateways/account/accountApi";
import { accountApiUnavailableResponse, getAccountRouteErrorMessage, getForwardHeaders, readResponseBody } from "../../../routeSupport";

type RouteContext = { params: Promise<{ affiliationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  const { affiliationId } = await context.params;
  try {
    const apiResponse = await fetch(`${baseUrl}/affiliations/${encodeURIComponent(affiliationId)}/approve`, {
      method: "POST",
      headers: getForwardHeaders(request, false),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, responseBody) }, { status: apiResponse.status });
    return NextResponse.json(parseAffiliationSummary(responseBody), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Account API response did not match the expected schema." }, { status: 502 });
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}
