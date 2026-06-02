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
  const text = await response.text();

  if (text.trim() === "") {
    if (!response.ok) {
      return {};
    }

    throw new Error("Wiki API response body is empty.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error("Wiki API response body is not valid JSON.", { cause: error });
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

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getWikiRouteErrorStatus = (error: unknown): number | undefined => {
  if (!isObjectRecord(error) || !isObjectRecord(error.response)) {
    return undefined;
  }

  const { status } = error.response;

  return typeof status === "number" ? status : undefined;
};

export const wikiImageUnavailableMessage =
  "Wiki images are temporarily unavailable. Please try again later.";

export const wikiDraftUnavailableMessage =
  "Wiki drafts are temporarily unavailable. Please try again later.";
