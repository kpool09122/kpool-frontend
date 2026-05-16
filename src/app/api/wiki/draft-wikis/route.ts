import { NextResponse, type NextRequest } from "next/server";
import { schemas } from "@kpool/types/wiki-private-api";
import { z } from "zod";

import {
  createWikiDraftWikisUrl,
  defaultWikiDraftPerPage,
  getDraftWikiErrorMessage,
  wikiDraftWikiListResponseSchema,
} from "../../../wiki/draftWiki";
import { getWikiImageApiBaseUrl } from "../../../wiki/wikiImageServerApi";
import { parseWithSchemaLog } from "../../../zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  parsePositiveIntegerParam,
  readJsonResponseBody,
} from "../wikiRouteSupport";

const parseBooleanParam = (value: string | null): boolean | undefined => {
  if (value === null) {
    return undefined;
  }

  return value === "true";
};

export async function GET(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  const statusResult = schemas.DraftWikiStatus.safeParse(
    request.nextUrl.searchParams.get("status"),
  );

  if (!statusResult.success) {
    return jsonErrorResponse("Valid draft wiki status is required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createWikiDraftWikisUrl({
        baseUrl,
        onlyMine: parseBooleanParam(request.nextUrl.searchParams.get("onlyMine")),
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiDraftPerPage,
        ),
        resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
        status: statusResult.data,
        translationSetIdentifier:
          request.nextUrl.searchParams.get("translationSetIdentifier") ?? undefined,
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
        { message: getDraftWikiErrorMessage({ response: { status: apiResponse.status, data: body } }) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki draft wiki list response",
        wikiDraftWikiListResponseSchema,
        body,
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: getDraftWikiErrorMessage(error) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getDraftWikiErrorMessage(error) },
      { status: 502 },
    );
  }
}
