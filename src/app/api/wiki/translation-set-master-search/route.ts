import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createTranslationSetMasterSearchUrl,
  translationSetMasterSearchResponseSchema,
  wikiResourceTypeSchema,
} from "@kpool/wiki";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../wikiRouteSupport";

const translationSetMasterSearchQuerySchema = z.object({
  keyword: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
  resourceType: wikiResourceTypeSchema,
});

const translationSetMasterSearchUnavailableMessage =
  "Translation set master search is temporarily unavailable. Please try again later.";

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki API is not configured.", 500);
  }

  const queryResult = translationSetMasterSearchQuerySchema.safeParse({
    keyword: request.nextUrl.searchParams.get("keyword"),
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    resourceType: request.nextUrl.searchParams.get("resourceType"),
  });

  if (!queryResult.success) {
    return jsonErrorResponse("resourceType and keyword are required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createTranslationSetMasterSearchUrl({
        baseUrl,
        keyword: queryResult.data.keyword,
        limit: queryResult.data.limit,
        resourceType: queryResult.data.resourceType,
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Translation set master search backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: translationSetMasterSearchUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "translation set master search response",
        translationSetMasterSearchResponseSchema,
        body,
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Translation set master search response schema validation failed", error);

      return NextResponse.json(
        { message: translationSetMasterSearchUnavailableMessage },
        { status: 502 },
      );
    }

    console.error("Translation set master search route failed", error);

    return NextResponse.json(
      { message: translationSetMasterSearchUnavailableMessage },
      { status: 502 },
    );
  }
}
