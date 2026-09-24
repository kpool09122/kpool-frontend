import { NextResponse, type NextRequest } from "next/server";
import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
  parseVerifyEmailRequest,
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
    const verification = parseVerifyEmailRequest(await request.json());
    const apiResponse = await fetch(`${baseUrl}/auth/verify-email`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...getAcceptLanguageForwardHeaders(request),
        "Content-Type": "application/json",
        ...getCookieForwardHeaders(request),
      },
      body: JSON.stringify(verification),
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
        parseWithSchemaLog("identity verify email response", identityApiTypes.schemas.VerifyEmailResult, body),
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
