import { NextResponse, type NextRequest } from "next/server";

import { getIdentityApiBaseUrl } from "@/gateways/identity/identityApi";
import {
  getAcceptLanguageForwardHeaders,
  getSessionForwardHeaders,
  identityApiNotConfiguredResponse,
  identityApiUnavailableResponse,
  readIdentityRouteResponseBody,
  withIdentitySetCookie,
} from "../routeSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getIdentityApiBaseUrl();
  if (!baseUrl) return identityApiNotConfiguredResponse();

  try {
    const apiResponse = await fetch(`${baseUrl}/auth/csrf-token`, {
      headers: {
        Accept: "application/json",
        ...getAcceptLanguageForwardHeaders(request),
        ...getSessionForwardHeaders(request),
      },
      cache: "no-store",
    });
    const response = apiResponse.ok
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(await readIdentityRouteResponseBody(apiResponse), { status: apiResponse.status });
    response.headers.set("Cache-Control", "no-store");

    return withIdentitySetCookie(response, apiResponse);
  } catch {
    return identityApiUnavailableResponse();
  }
}
