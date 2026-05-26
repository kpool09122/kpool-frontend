import { NextResponse, type NextRequest } from "next/server";

export const identityApiNotConfiguredResponse = (): NextResponse =>
  NextResponse.json(
    { message: "Identity API is not configured." },
    { status: 500 },
  );

export const identityApiSchemaErrorResponse = (): NextResponse =>
  NextResponse.json(
    { message: "Identity API response did not match the expected schema." },
    { status: 502 },
  );

export const identityApiUnavailableResponse = (): NextResponse =>
  NextResponse.json(
    { message: "Identity API is temporarily unavailable." },
    { status: 502 },
  );

export const readIdentityRouteResponseBody = async (response: Response): Promise<unknown> => {
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

export const getCookieForwardHeaders = (request: NextRequest): Record<"Cookie", string> | Record<string, never> => {
  const cookie = request.headers.get("cookie");

  return cookie ? { Cookie: cookie } : {};
};

export const getAcceptLanguageForwardHeaders = (
  request: NextRequest,
): Record<"Accept-Language", string> | Record<string, never> => {
  const acceptLanguage = request.headers.get("accept-language");

  return acceptLanguage ? { "Accept-Language": acceptLanguage } : {};
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

export const withIdentitySetCookie = (
  response: NextResponse,
  apiResponse: Response,
): NextResponse => {
  getSetCookieHeaders(apiResponse.headers).forEach((setCookie) => {
    response.headers.append("set-cookie", setCookie);
  });

  return response;
};
