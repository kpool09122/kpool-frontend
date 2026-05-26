import { NextResponse, type NextRequest } from "next/server";
import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
  parseCreateIdentityRequest,
} from "@/gateways/identity/identityApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getAcceptLanguageForwardHeaders,
  getCookieForwardHeaders,
  identityApiNotConfiguredResponse,
  identityApiSchemaErrorResponse,
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
    const identity = parseCreateIdentityRequest(await request.json());
    const apiResponse = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...getAcceptLanguageForwardHeaders(request),
        "Content-Type": "application/json",
        ...getCookieForwardHeaders(request),
      },
      body: JSON.stringify(identity),
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

    return withIdentitySetCookie(
      NextResponse.json(
        parseWithSchemaLog("identity register response", identityApiTypes.schemas.IdentitySummary, body),
        { status: 201 },
      ),
      apiResponse,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return identityApiSchemaErrorResponse();
    }

    return identityApiUnavailableResponse();
  }
}
