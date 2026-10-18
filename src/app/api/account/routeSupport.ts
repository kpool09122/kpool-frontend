import { getApiErrorBody } from "@/gateways/support/apiError";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";

import { NextResponse, type NextRequest } from "next/server";

export const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const getForwardHeaders = (request: NextRequest, hasBody: boolean): HeadersInit => {
  const acceptLanguage = request.headers.get("accept-language");
  const cookie = request.headers.get("cookie");

  return {
    Accept: "application/json",
    ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...getCsrfForwardHeaders(request.headers),
    ...(cookie ? { Cookie: cookie } : {}),
  };
};

export const accountApiUnavailableResponse = () =>
  NextResponse.json(
    { message: "Account API is not configured." },
    { status: 500 },
  );

export const getAccountRouteErrorBody = (status: number, body: unknown) =>
  getApiErrorBody(body, `Account API request failed with status ${status}.`);
