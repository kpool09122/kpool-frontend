import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiMasterSearchUrl,
  wikiMasterSearchResponseSchema,
  wikiResourceTypeSchema,
} from "@kpool/wiki";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../wikiRouteSupport";

const wikiMasterSearchQuerySchema = z.object({
  keyword: z.string().trim().min(1),
  language: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
  resourceType: wikiResourceTypeSchema,
});

const wikiMasterSearchUnavailableMessage =
  "Wiki master search is temporarily unavailable. Please try again later.";

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki API is not configured.", 500);
  }

  const queryResult = wikiMasterSearchQuerySchema.safeParse({
    keyword: request.nextUrl.searchParams.get("keyword"),
    language: request.nextUrl.searchParams.get("language"),
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    resourceType: request.nextUrl.searchParams.get("resourceType"),
  });

  if (!queryResult.success) {
    return jsonErrorResponse("language, resourceType and keyword are required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createWikiMasterSearchUrl({
        baseUrl,
        keyword: queryResult.data.keyword,
        language: queryResult.data.language,
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
      console.error("Wiki master search backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiMasterSearchUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki master search response", wikiMasterSearchResponseSchema, body),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Wiki master search response schema validation failed", error);

      return NextResponse.json(
        { message: wikiMasterSearchUnavailableMessage },
        { status: 502 },
      );
    }

    console.error("Wiki master search route failed", error);

    return NextResponse.json(
      { message: wikiMasterSearchUnavailableMessage },
      { status: 502 },
    );
  }
}
