import { NextResponse } from "next/server";

export const getForwardedWikiApiHeaders = (headers: Headers): HeadersInit => {
  const forwardedHeaders: Record<string, string> = {
    Accept: "application/json",
  };
  const acceptLanguage = headers.get("accept-language");
  const cookie = headers.get("cookie");

  if (acceptLanguage) {
    forwardedHeaders["Accept-Language"] = acceptLanguage;
  }

  if (cookie) {
    forwardedHeaders.Cookie = cookie;
  }

  return forwardedHeaders;
};

export const readJsonResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const parsePositiveIntegerParam = (
  value: string | null,
  fallback: number,
): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const jsonErrorResponse = (message: string, status: number): Response =>
  NextResponse.json({ message }, { status });
