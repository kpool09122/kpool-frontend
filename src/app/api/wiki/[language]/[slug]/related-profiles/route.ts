import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiRelatedProfilesUrl,
  wikiResourceTypeSchema,
  wikiRelatedProfilesResponseSchema,
} from "@kpool/wiki";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../../../wikiRouteSupport";

const relatedProfileResourceTypeSchema = wikiResourceTypeSchema;
const wikiRelatedProfilesUnavailableMessage =
  "Related profiles are temporarily unavailable. Please try again later.";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ language: string; slug: string }> },
) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki API is not configured.", 500);
  }

  const resourceTypeResult = relatedProfileResourceTypeSchema.safeParse(
    request.nextUrl.searchParams.get("resourceType"),
  );

  if (!resourceTypeResult.success) {
    return jsonErrorResponse("resourceType is required.", 400);
  }

  const { language, slug } = await context.params;

  try {
    const apiResponse = await fetch(
      createWikiRelatedProfilesUrl({
        baseUrl,
        language,
        resourceType: resourceTypeResult.data,
        slug,
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Wiki related profiles backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        {
          message: wikiRelatedProfilesUnavailableMessage,
        },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki related profiles response",
        wikiRelatedProfilesResponseSchema,
        body,
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Wiki related profiles response schema validation failed", error);

      return NextResponse.json(
        { message: wikiRelatedProfilesUnavailableMessage },
        { status: 502 },
      );
    }

    console.error("Wiki related profiles route failed", error);

    return NextResponse.json(
      { message: wikiRelatedProfilesUnavailableMessage },
      { status: 502 },
    );
  }
}
