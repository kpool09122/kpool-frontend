import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAccountApiBaseUrl, parseAffiliationSummary, parseListAffiliationsResponse, parseRequestAffiliationRequest } from "@/gateways/account/accountApi";
import { accountApiUnavailableResponse, getAccountRouteErrorMessage, getForwardHeaders, readResponseBody } from "../routeSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  try {
    const queryString = new URL(request.url).searchParams.toString();
    const apiResponse = await fetch(`${baseUrl}/affiliations${queryString ? `?${queryString}` : ""}`, {
      method: "GET",
      headers: getForwardHeaders(request, false),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, responseBody) }, { status: apiResponse.status });
    return NextResponse.json(parseListAffiliationsResponse(responseBody), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Invalid account affiliations response." }, { status: 502 });
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  try {
    const body = parseRequestAffiliationRequest(await request.json());
    const apiResponse = await fetch(`${baseUrl}/affiliations`, {
      method: "POST",
      headers: getForwardHeaders(request, true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, responseBody) }, { status: apiResponse.status });
    return NextResponse.json(parseAffiliationSummary(responseBody), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Invalid account affiliation request." }, { status: 422 });
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}
