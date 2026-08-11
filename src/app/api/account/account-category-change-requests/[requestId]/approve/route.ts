import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAccountApiBaseUrl, parseAccountCategoryChangeRequestSummary } from "@/gateways/account/accountApi";
import { accountApiUnavailableResponse, getAccountRouteErrorMessage, getForwardHeaders, readResponseBody } from "../../../routeSupport";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  const { requestId } = await context.params;
  try {
    const apiResponse = await fetch(`${baseUrl}/account-category-change-requests/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
      headers: getForwardHeaders(request, false),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, responseBody) }, { status: apiResponse.status });
    return NextResponse.json(parseAccountCategoryChangeRequestSummary(responseBody), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Account API response did not match the expected schema." }, { status: 502 });
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}
