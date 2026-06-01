import { NextResponse, type NextRequest } from "next/server";
import { wikiPrivateApiTypes } from "@kpool/types";

import {
  createWikiDraftImagesUrl,
  defaultWikiImagePerPage,
  normalizeWikiDraftImageListResponse,
  wikiDraftImageListResponseSchema,
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

  const statusResult = wikiPrivateApiTypes.schemas.DraftImageStatus.safeParse(
    request.nextUrl.searchParams.get("status"),
  );

  if (!statusResult.success) {
    return jsonErrorResponse("Valid draft image status is required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createWikiDraftImagesUrl({
        baseUrl,
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiImagePerPage,
        ),
        status: statusResult.data,
        wikiIdentifier: request.nextUrl.searchParams.get("wikiIdentifier") ?? undefined,
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Wiki draft images backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki draft image list response",
        wikiDraftImageListResponseSchema,
        normalizeWikiDraftImageListResponse(body),
      ),
    );
  } catch (error) {
    console.error("Wiki draft images route failed", error);

    return NextResponse.json(
      { message: wikiImageUnavailableMessage },
      { status: 502 },
    );
  }
}
