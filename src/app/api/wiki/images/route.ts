import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiImagesUrl,
  defaultWikiImagePerPage,
  getWikiImageErrorMessage,
  wikiImageListResponseSchema,
} from "../../../wiki/wikiImageModel";
import { getWikiImageApiBaseUrl } from "../../../wiki/wikiImageServerApi";
import { parseWithSchemaLog } from "../../../zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  parsePositiveIntegerParam,
  readJsonResponseBody,
} from "../wikiRouteSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki image API is not configured.", 500);
  }

  const translationSetIdentifier = request.nextUrl.searchParams.get("translationSetIdentifier");

  if (!translationSetIdentifier) {
    return jsonErrorResponse("translationSetIdentifier is required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createWikiImagesUrl({
        baseUrl,
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiImagePerPage,
        ),
        translationSetIdentifier,
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

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
