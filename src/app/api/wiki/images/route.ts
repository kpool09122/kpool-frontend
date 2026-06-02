import { NextResponse, type NextRequest } from "next/server";

import {
  createWikiImagesUrl,
  defaultWikiImagePerPage,
  wikiImageListResponseSchema,
} from "@kpool/wiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  parsePositiveIntegerParam,
  readJsonResponseBody,
  wikiImageUnavailableMessage,
} from "../wikiRouteSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();

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
      console.error("Wiki images backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki image list response", wikiImageListResponseSchema, body),
    );
  } catch (error) {
    console.error("Wiki images route failed", error);

    return NextResponse.json(
      { message: wikiImageUnavailableMessage },
      { status: 502 },
    );
  }
}
