import { getVisitorLocationSigner } from "@/app/api/visitorLocation";
import { getApiErrorBody } from "@/gateways/support/apiError";
import { NextResponse, type NextRequest } from "next/server";
import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
} from "@/gateways/identity/identityApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getAcceptLanguageForwardHeaders,
  getSessionForwardHeaders,
  identityApiNotConfiguredResponse,
  identityApiSchemaErrorResponse,
  identityApiUnavailableResponse,
  readIdentityRouteResponseBody,
  withIdentitySetCookie,
} from "../../../routeSupport";

type SocialRedirectRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

const normalizeReturnTo = (value: string): string =>
  value.startsWith("/") && !value.startsWith("//") ? value : "/admin";

export async function GET(request: NextRequest, context: SocialRedirectRouteContext) {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return identityApiNotConfiguredResponse();
  }

  try {
    const { provider } = await context.params;
    const requestParams = new URL(request.url).searchParams;
    const returnTo = requestParams.get("return_to");
    const oneTimeToken = requestParams.get("oneTimeToken");
    const searchParams = new URLSearchParams();

    if (returnTo) {
      searchParams.set("return_to", normalizeReturnTo(returnTo));
    }

    if (oneTimeToken) {
      searchParams.set("oneTimeToken", oneTimeToken);
    }

    const query = searchParams.toString();
    const url = `${baseUrl}/auth/social/${encodeURIComponent(provider)}/redirect${query ? `?${query}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...getAcceptLanguageForwardHeaders(request),
      ...getSessionForwardHeaders(request),
    };
    const signer = getVisitorLocationSigner("GET");
    if (signer) Object.assign(headers, await signer(url, "", headers));
    const apiResponse = await fetch(url, { headers, cache: "no-store" });
    const body = await readIdentityRouteResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return withIdentitySetCookie(
        NextResponse.json(
          getApiErrorBody(body, getIdentityRouteErrorMessage({ status: apiResponse.status, data: body })),
          { status: apiResponse.status },
        ),
        apiResponse,
      );
    }

    return withIdentitySetCookie(
      NextResponse.json(
        parseWithSchemaLog("identity social redirect response", identityApiTypes.schemas.RedirectUrlResult, body),
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
