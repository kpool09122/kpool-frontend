import { NextResponse, type NextRequest } from "next/server";
import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
} from "@/gateways/identity/identityApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getCookieForwardHeaders,
  identityApiNotConfiguredResponse,
  identityApiSchemaErrorResponse,
  identityApiUnavailableResponse,
  readIdentityRouteResponseBody,
  withIdentitySetCookie,
} from "../routeSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return identityApiNotConfiguredResponse();
  }

  try {
    const apiResponse = await fetch(`${baseUrl}/auth/me`, {
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

    return withIdentitySetCookie(
      NextResponse.json(
        parseWithSchemaLog(
          "identity authenticated response",
          identityApiTypes.schemas.AuthenticatedIdentitySummary,
          body,
        ),
        { status: 200 },
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
