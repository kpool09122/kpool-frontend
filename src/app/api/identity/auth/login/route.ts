import { NextResponse, type NextRequest } from "next/server";
import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
  parseIdentityLoginRequest,
} from "@/gateways/identity/identityApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

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
    const credentials = parseIdentityLoginRequest(await request.json());
    const apiResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      body: JSON.stringify(credentials),
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

    return withSetCookie(
      NextResponse.json(
        parseWithSchemaLog("identity login response", identityApiTypes.schemas.IdentitySummary, body),
        { status: 200 },
      ),
      apiResponse,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Identity API response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getIdentityRouteErrorMessage({ data: error }) },
      { status: 502 },
    );
  }
}
