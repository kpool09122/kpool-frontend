import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiRelatedProfilesUrl,
  getWikiRelatedProfilesErrorMessage,
  wikiRelatedProfilesResponseSchema,
  type WikiResourceType,
} from "@kpool/wiki";
import { getWikiImageApiBaseUrl } from "@/gateways/wiki/wikiImageServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../../../wikiRouteSupport";

const relatedProfileResourceTypeSchema = z.enum(["agency", "group", "song", "talent"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ language: string; slug: string }> },
) {
  const baseUrl = getWikiImageApiBaseUrl();

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
        resourceType: resourceTypeResult.data as WikiResourceType,
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
      return NextResponse.json(
        {
          message: getWikiRelatedProfilesErrorMessage({
            response: { status: apiResponse.status, data: body },
          }),
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
      return NextResponse.json(
        { message: getWikiRelatedProfilesErrorMessage(error) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getWikiRelatedProfilesErrorMessage(error) },
      { status: 502 },
    );
  }
}
