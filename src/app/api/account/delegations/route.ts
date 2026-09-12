import { NextResponse, type NextRequest } from "next/server";

import { getAccountApiBaseUrl, parseAccountDelegationSummary, parseRequestDelegationRequest, type RequestDelegationRequest } from "@/gateways/account/accountApi";
import { accountApiUnavailableResponse, getAccountRouteErrorMessage, getForwardHeaders, readResponseBody } from "../routeSupport";

export async function POST(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();

  let parsedBody: RequestDelegationRequest;
  try {
    parsedBody = parseRequestDelegationRequest(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid account delegation request." }, { status: 422 });
  }

  const body = { targetAccountIdentifier: parsedBody.targetAccountIdentifier };
  try {
    const apiResponse = await fetch(`${baseUrl}/delegations`, {
      method: "POST",
      headers: getForwardHeaders(request, true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);
    if (!apiResponse.ok) return NextResponse.json({ message: getAccountRouteErrorMessage(apiResponse.status, responseBody) }, { status: apiResponse.status });
    return NextResponse.json(parseAccountDelegationSummary(responseBody), { status: apiResponse.status });
  } catch {
    return NextResponse.json({ message: "Account API is temporarily unavailable." }, { status: 502 });
  }
}
