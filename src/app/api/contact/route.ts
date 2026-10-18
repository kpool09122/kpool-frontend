import { getApiErrorBody } from "@/gateways/support/apiError";

import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";

import { NextResponse, type NextRequest } from "next/server";

import {
  getSiteManagementApiBaseUrl,
  parseSubmitContactRequest,
  parseSubmitContactResponse,
  type SubmitContactRequest,
} from "@/gateways/contact/contactApi";

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const unavailableResponse = (status = 502): NextResponse =>
  NextResponse.json(
    { message: "Contact API is temporarily unavailable." },
    { status },
  );

export async function POST(request: NextRequest) {
  const baseUrl = getSiteManagementApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Contact API is not configured." },
      { status: 500 },
    );
  }

  let requestBody: SubmitContactRequest;

  try {
    requestBody = parseSubmitContactRequest(await request.json());
  } catch {
    return NextResponse.json(
      { message: "Contact request is invalid." },
      { status: 400 },
    );
  }

  try {
    const acceptLanguage = request.headers.get("accept-language");
    const cookie = request.headers.get("cookie");
    const apiResponse = await fetch(`${baseUrl}/contact/submit`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
        "Content-Type": "application/json",
        ...getCsrfForwardHeaders(request.headers),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        getApiErrorBody(responseBody, "Contact API is temporarily unavailable."),
        { status: apiResponse.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(parseSubmitContactResponse(responseBody), { status: 201 });
  } catch {
    return unavailableResponse();
  }
}
