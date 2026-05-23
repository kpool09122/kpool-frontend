import { NextResponse, type NextRequest } from "next/server";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
} from "@/gateways/identity/identityApi";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getSetCookieHeaders = (headers: Headers): string[] => {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithSetCookie.getSetCookie?.();

  if (setCookies && setCookies.length > 0) {
    return setCookies;
  }

  const setCookie = headers.get("set-cookie");

  return setCookie ? [setCookie] : [];
};

const withSetCookie = (response: NextResponse, apiResponse: Response): NextResponse => {
  getSetCookieHeaders(apiResponse.headers).forEach((setCookie) => {
    response.headers.append("set-cookie", setCookie);
  });

  return response;
};

export async function POST(request: NextRequest) {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Identity API is not configured." },
      { status: 500 },
    );
  }

  try {
    const apiResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      cache: "no-store",
    });
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return withSetCookie(
        NextResponse.json(
          { message: getIdentityRouteErrorMessage({ status: apiResponse.status, data: body }) },
          { status: apiResponse.status },
        ),
        apiResponse,
      );
    }

    return withSetCookie(NextResponse.json({}, { status: 200 }), apiResponse);
  } catch (error) {
    return NextResponse.json(
      { message: getIdentityRouteErrorMessage({ data: error }) },
      { status: 502 },
    );
  }
}
