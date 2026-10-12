import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseAccountCategoryChangeRequestSummary,
  parseLatestAccountCategoryChangeRequestResponse,
} from "@/gateways/account/accountApi";
import {
  accountApiUnavailableResponse,
  getAccountRouteErrorMessage,
  getForwardHeaders,
  readResponseBody,
} from "../../../routeSupport";

export const proxySelfServiceCategoryChange = async (
  request: NextRequest,
  accountId: string,
  requestId?: string,
) => {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const suffix =
    requestId === undefined
      ? "latest"
      : `${encodeURIComponent(requestId)}/withdraw`;
  try {
    // Authentication and ownership are enforced by the dedicated backend API, not management policy.
    const upstream = await fetch(
      `${baseUrl}/accounts/${encodeURIComponent(accountId)}/category-change-requests/${suffix}`,
      {
        method: requestId === undefined ? "GET" : "POST",
        headers: getForwardHeaders(request, false),
        cache: "no-store",
      },
    );
    cookies.push(...upstream.headers.getSetCookie());
    const body = await readResponseBody(upstream);
    if (!upstream.ok)
      return respond(
        { message: getAccountRouteErrorMessage(upstream.status, body) },
        upstream.status,
      );
    return respond(
      requestId === undefined
        ? parseLatestAccountCategoryChangeRequestResponse(body)
        : parseAccountCategoryChangeRequestSummary(body),
      upstream.status,
    );
  } catch (error) {
    return respond(
      {
        message:
          error instanceof z.ZodError
            ? "Account API response did not match the expected schema."
            : "Account API is temporarily unavailable.",
      },
      502,
    );
  }
};
