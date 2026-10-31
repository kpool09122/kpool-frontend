import { getApiErrorBody } from "@/gateways/support/apiError";
import { NextResponse, type NextRequest } from "next/server";

export const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const getForwardHeaders = (request: NextRequest): Record<string, string> => {
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

export const unavailableResponse = () =>
  NextResponse.json({ message: "Contact API is not configured." }, { status: 500 });
