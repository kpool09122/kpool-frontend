import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseInvitationSummaries,
  parseInviteAccountMembersRequest,
} from "@/gateways/account/accountApi";

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

export async function POST(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Account API is not configured." },
      { status: 500 },
    );
  }

  let invitationRequest;

  try {
    invitationRequest = parseInviteAccountMembersRequest(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid account invitation request." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { message: "Invalid account invitation request." },
      { status: 400 },
    );
  }

  try {
    const acceptLanguage = request.headers.get("accept-language");
    const cookie = request.headers.get("cookie");
    const apiResponse = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(invitationRequest),
      cache: "no-store",
    });
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getAccountRouteErrorMessage(apiResponse.status, body) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parseInvitationSummaries(body), { status: apiResponse.status });
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
}
