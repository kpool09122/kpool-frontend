import { getApiErrorBody } from "@/gateways/support/apiError";
import { NextResponse, type NextRequest } from "next/server";

export const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const getForwardHeaders = (request: NextRequest): HeadersInit => {
  const acceptLanguage = request.headers.get("accept-language");
  const cookie = request.headers.get("cookie");
  return {
    Accept: "application/json",
    ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
  };
};

export const getRouteErrorBody = (status: number, body: unknown) =>
  getApiErrorBody(body, `Contact API request failed with status ${status}.`);

export const contactResponse = (body: unknown, status: number, cookies: string[] = []) => {
  const response = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
  return response;
};

export const unavailableResponse = () =>
  contactResponse({ message: "Contact API is not configured." }, 500);
