import { NextResponse, type NextRequest } from "next/server";

import {
  getAccountApiBaseUrl,
  parseCompleteInitialSetupRequest,
  type CompleteInitialSetupRequest,
} from "@/gateways/account/accountApi";
import {
  accountApiUnavailableResponse,
  getAccountRouteErrorMessage,
  getForwardHeaders,
  readResponseBody,
} from "../../routeSupport";

const getProblemCode = (body: unknown): string | undefined =>
  typeof body === "object" && body !== null && "code" in body &&
  typeof (body as { code: unknown }).code === "string"
    ? (body as { code: string }).code
    : undefined;

export async function POST(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();

  let parsedBody: CompleteInitialSetupRequest;
  try {
    parsedBody = parseCompleteInitialSetupRequest(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid account setup request." }, { status: 422 });
  }

  try {
    const apiResponse = await fetch(`${baseUrl}/accounts/setup`, {
      method: "POST",
      headers: getForwardHeaders(request, true),
      body: JSON.stringify(parsedBody),
      cache: "no-store",
    });

    if (apiResponse.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const responseBody = await readResponseBody(apiResponse);
    const code = getProblemCode(responseBody);

    return NextResponse.json(
      {
        message: getAccountRouteErrorMessage(apiResponse.status, responseBody),
        ...(code ? { code } : {}),
      },
      { status: apiResponse.status },
    );
  } catch {
    return NextResponse.json(
      { message: "Account API is temporarily unavailable." },
      { status: 502 },
    );
  }
}
