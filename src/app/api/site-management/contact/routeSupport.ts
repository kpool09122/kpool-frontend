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

export const getRouteErrorMessage = (status: number, body: unknown): string => {
  if (status >= 500) return "Contact API is temporarily unavailable.";
  if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") return body.detail;
  if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") return body.message;
  return `Contact API request failed with status ${status}.`;
};

export const unavailableResponse = () =>
  NextResponse.json({ message: "Contact API is not configured." }, { status: 500 });
