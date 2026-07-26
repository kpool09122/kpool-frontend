import { NextResponse, type NextRequest } from "next/server";

export const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const hasMessage = (value: unknown): value is { message: string } =>
  typeof value === "object" &&
  value !== null &&
  "message" in value &&
  typeof (value as { message: unknown }).message === "string";

const hasDetail = (value: unknown): value is { detail: string } =>
  typeof value === "object" &&
  value !== null &&
  "detail" in value &&
  typeof (value as { detail: unknown }).detail === "string";

export const getAccountRouteErrorMessage = (status: number, body: unknown): string => {
  if (status >= 500) {
    return "Account API is temporarily unavailable.";
  }

  if (hasMessage(body)) {
    return body.message;
  }

  if (hasDetail(body)) {
    return body.detail;
  }

  return `Account API request failed with status ${status}.`;
};

export const getForwardHeaders = (request: NextRequest, hasBody: boolean): HeadersInit => {
  const acceptLanguage = request.headers.get("accept-language");
  const cookie = request.headers.get("cookie");

  return {
    Accept: "application/json",
    ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
  };
};

export const accountApiUnavailableResponse = () =>
  NextResponse.json(
    { message: "Account API is not configured." },
    { status: 500 },
  );
