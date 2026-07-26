import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parsePrincipalGroupsResponse,
  parseUpdatePrincipalGroupMembersRequest,
} from "@/gateways/account/accountApi";
import {
  accountApiUnavailableResponse,
  getAccountRouteErrorMessage,
  getForwardHeaders,
  readResponseBody,
} from "../../routeSupport";

export async function PATCH(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();

  if (!baseUrl) {
    return accountApiUnavailableResponse();
  }

  let updateRequest;

  try {
    updateRequest = parseUpdatePrincipalGroupMembersRequest(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid principal group members update request." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { message: "Invalid principal group members update request." },
      { status: 400 },
    );
  }

  try {
    const apiResponse = await fetch(`${baseUrl}/principal-groups/members`, {
      method: "PATCH",
      headers: getForwardHeaders(request, true),
      body: JSON.stringify(updateRequest),
      cache: "no-store",
    });
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getAccountRouteErrorMessage(apiResponse.status, body) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parsePrincipalGroupsResponse(body), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Account API response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: "Account API is temporarily unavailable." },
      { status: 502 },
    );
  }
}
