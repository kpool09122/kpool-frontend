import { NextResponse, type NextRequest } from "next/server";

import {
  createWikiImageDeletionRequestsUrl,
  defaultWikiImagePerPage,
  wikiImageDeletionRequestListResponseSchema,
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

  try {
    const apiResponse = await fetch(
      createWikiImageDeletionRequestsUrl({
        baseUrl,
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiImagePerPage,
        ),
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Wiki image deletion requests backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki image deletion request list response",
        wikiImageDeletionRequestListResponseSchema,
        body,
      ),
    );
  } catch (error) {
    console.error("Wiki image deletion requests route failed", error);

    return NextResponse.json(
      { message: wikiImageUnavailableMessage },
      { status: 502 },
    );
  }
}
