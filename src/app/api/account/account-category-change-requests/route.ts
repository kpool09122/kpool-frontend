import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseListAccountCategoryChangeRequestsResponse,
} from "@/gateways/account/accountApi";
import { accountApiUnavailableResponse, getAccountRouteErrorMessage, getForwardHeaders, readResponseBody } from "../routeSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) {
    return accountApiUnavailableResponse();
  }
  const upstreamUrl = new URL(`${baseUrl}/account-category-change-requests`);
  const searchParams = new URL(request.url).searchParams;
  for (const key of ["status", "requestedAccountCategory", "perPage", "page"]) {
    const value = searchParams.get(key);
    if (value) upstreamUrl.searchParams.set(key, value);
  }
  try {
    const apiResponse = await fetch(upstreamUrl, { method: "GET", headers: getForwardHeaders(request, false), cache: "no-store" });
    const body = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, body) }, { status: apiResponse.status });
    return NextResponse.json(parseListAccountCategoryChangeRequestsResponse(body), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Account API response did not match the expected schema." }, { status: 502 });
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}
