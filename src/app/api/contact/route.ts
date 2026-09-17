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
    const apiResponse = await fetch(`${baseUrl}/contact/submit/v1`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      if (apiResponse.status === 422) {
        return NextResponse.json(
          { message: "Contact request is invalid." },
          { status: 422 },
        );
      }

      return unavailableResponse(apiResponse.status >= 500 ? apiResponse.status : 502);
    }

    return NextResponse.json(parseSubmitContactResponse(responseBody), { status: 201 });
  } catch {
    return unavailableResponse();
  }
}
