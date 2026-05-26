import { NextResponse, type NextRequest } from "next/server";
import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
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

export async function GET(request: NextRequest) {
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Identity API is not configured." },
      { status: 500 },
    );
  }

  try {
    const apiResponse = await fetch(`${baseUrl}/auth/me`, {
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

    return withSetCookie(
      NextResponse.json(
        parseWithSchemaLog(
          "identity authenticated response",
          identityApiTypes.schemas.AuthenticatedIdentitySummary,
          body,
        ),
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
