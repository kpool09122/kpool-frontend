import { NextResponse, type NextRequest } from "next/server";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
} from "@/gateways/identity/identityApi";
import {
  getCookieForwardHeaders,
  identityApiNotConfiguredResponse,
  identityApiUnavailableResponse,
  readIdentityRouteResponseBody,
  withIdentitySetCookie,
} from "../routeSupport";

export async function POST(request: NextRequest) {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return identityApiNotConfiguredResponse();
  }

  try {
    const apiResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...getCookieForwardHeaders(request),
      },
      cache: "no-store",
    });
    const body = await readIdentityRouteResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return withIdentitySetCookie(
        NextResponse.json(
          { message: getIdentityRouteErrorMessage({ status: apiResponse.status, data: body }) },
          { status: apiResponse.status },
        ),
        apiResponse,
      );
    }

    return withIdentitySetCookie(NextResponse.json({}, { status: 200 }), apiResponse);
  } catch {
    return identityApiUnavailableResponse();
  }
}
