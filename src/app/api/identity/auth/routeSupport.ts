import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getIdentityApiBaseUrl, getIdentityRouteErrorMessage } from "@/gateways/identity/identityApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

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

type ForwardIdentityRouteOptions = {
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  requestSchema?: z.ZodType;
  responseSchema: z.ZodType;
};

export const forwardIdentityRoute = async (
  request: NextRequest,
  options: ForwardIdentityRouteOptions,
): Promise<NextResponse> => {
  const {
    method,
    path,
    requestSchema,
    responseSchema,
  } = options;
  const baseUrl = getIdentityApiBaseUrl();

  if (!baseUrl) {
    return identityApiNotConfiguredResponse();
  }

  try {
    const requestBody = requestSchema
      ? parseWithSchemaLog(`identity ${path} request`, requestSchema, await request.json())
      : undefined;
    const apiResponse = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...getAcceptLanguageForwardHeaders(request),
        ...(requestBody === undefined ? {} : { "Content-Type": "application/json" }),
        ...getCookieForwardHeaders(request),
      },
      ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
      cache: "no-store",
    });
    const body = await readIdentityRouteResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return withIdentitySetCookie(
        NextResponse.json(
          { message: getIdentityRouteErrorMessage({ status: apiResponse.status, data: body }) },
          { status: apiResponse.status },
        ),
        apiResponse,
      );
    }

    if (apiResponse.status === 204 || apiResponse.status === 205) {
      return withIdentitySetCookie(
        new NextResponse(null, { status: apiResponse.status }),
        apiResponse,
      );
    }

    return withIdentitySetCookie(
      NextResponse.json(
        parseWithSchemaLog(`identity ${path} response`, responseSchema, body ?? {}),
        { status: apiResponse.status },
      ),
      apiResponse,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return identityApiSchemaErrorResponse();
    }

    return identityApiUnavailableResponse();
  }
};
