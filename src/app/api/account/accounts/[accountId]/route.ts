import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseAccountSummary,
  parseUpdateAccountRequest,
} from "@/gateways/account/accountApi";

type AccountRouteContext = {
  params: Promise<{ accountId: string }>;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
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

const getAccountRouteErrorMessage = (status: number, body: unknown): string => {
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

const getForwardHeaders = (request: NextRequest, hasBody: boolean): HeadersInit => {
  const acceptLanguage = request.headers.get("accept-language");
  const cookie = request.headers.get("cookie");

  return {
    Accept: "application/json",
    ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
  };
};

const unavailableResponse = () =>
  NextResponse.json(
    { message: "Account API is not configured." },
    { status: 500 },
  );

const forwardAccountRequest = async (
  request: NextRequest,
  { method, body }: { method: "GET" | "PATCH"; body?: unknown },
  context: AccountRouteContext,
) => {
  const baseUrl = getAccountApiBaseUrl();

  if (!baseUrl) {
    return unavailableResponse();
  }

  try {
    const { accountId } = await context.params;
    const apiResponse = await fetch(`${baseUrl}/accounts/${accountId}`, {
      method,
      headers: getForwardHeaders(request, Boolean(body)),
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getAccountRouteErrorMessage(apiResponse.status, responseBody) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parseAccountSummary(responseBody), { status: apiResponse.status });
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
};

export async function GET(request: NextRequest, context: AccountRouteContext) {
  return forwardAccountRequest(request, { method: "GET" }, context);
}

export async function PATCH(request: NextRequest, context: AccountRouteContext) {
  return forwardAccountRequest(
    request,
    { method: "PATCH", body: parseUpdateAccountRequest(await request.json()) },
    context,
  );
}
