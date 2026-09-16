import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccountApiBaseUrl,
  parseSwitchAccountRequest,
  parseSwitchAccountResponse,
  type SwitchAccountRequest,
} from "@/gateways/account/accountApi";
import {
  accountApiUnavailableResponse,
  getAccountRouteErrorMessage,
  getForwardHeaders,
  readResponseBody,
} from "../../routeSupport";

export async function POST(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();

  let parsedBody: SwitchAccountRequest;
  try {
    parsedBody = parseSwitchAccountRequest(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid account switch request." }, { status: 422 });
  }

  const body = { delegationIdentifier: parsedBody.delegationIdentifier ?? null };

  try {
    const apiResponse = await fetch(`${baseUrl}/accounts/switch`, {
      method: "POST",
      headers: getForwardHeaders(request, true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getAccountRouteErrorMessage(apiResponse.status, responseBody) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parseSwitchAccountResponse(responseBody), {
      status: apiResponse.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid account switch response." }, { status: 502 });
    }

    return NextResponse.json(
      { message: "Account API is temporarily unavailable." },
      { status: 502 },
    );
  }
}
