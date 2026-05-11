import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiImagesUrl,
  defaultWikiImagePerPage,
  getWikiImageApiBaseUrl,
  getWikiImageErrorMessage,
  wikiImageListResponseSchema,
} from "../../../wiki/wikiImages";
import { parseWithSchemaLog } from "../../../zodErrorLog";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export async function GET(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();
  const cookieHeader = request.headers.get("cookie");

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Wiki image API is not configured." },
      { status: 500 },
    );
  }

  const wikiIdentifier = request.nextUrl.searchParams.get("wikiIdentifier");

  if (!wikiIdentifier) {
    return NextResponse.json(
      { message: "wikiIdentifier is required." },
      { status: 400 },
    );
  }

  try {
    const apiResponse = await fetch(
      createWikiImagesUrl({
        baseUrl,
        page: parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveInteger(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiImagePerPage,
        ),
        wikiIdentifier,
      }),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(request.headers.get("accept-language")
            ? { "Accept-Language": request.headers.get("accept-language") ?? "" }
            : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
      },
    );
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getWikiImageErrorMessage({ response: { status: apiResponse.status, data: body } }) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki image list response", wikiImageListResponseSchema, body),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: getWikiImageErrorMessage(error) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getWikiImageErrorMessage(error) },
      { status: 502 },
    );
  }
}
