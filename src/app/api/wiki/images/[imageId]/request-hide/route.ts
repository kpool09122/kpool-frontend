import { NextResponse, type NextRequest } from "next/server";

import {
  createWikiImageHideRequestUrl,
  wikiImageHideRequestResponseSchema,
  wikiImageHideRequestSchema,
} from "@kpool/wiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
  wikiImageUnavailableMessage,
} from "../../../wikiRouteSupport";

type WikiImageHideRequestRouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: WikiImageHideRequestRouteContext,
) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki image API is not configured.", 500);
  }

  try {
    const { imageId } = await context.params;
    const apiResponse = await fetch(
      createWikiImageHideRequestUrl({
        baseUrl,
        imageIdentifier: imageId,
      }),
      {
        method: "POST",
        headers: {
          ...getForwardedWikiApiHeaders(request.headers),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          parseWithSchemaLog("wiki image hide request body", wikiImageHideRequestSchema, await request.json()),
        ),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Wiki image hide request backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki image hide request response", wikiImageHideRequestResponseSchema, body),
      { status: apiResponse.status },
    );
  } catch (error) {
    console.error("Wiki image hide request route failed", error);

    return NextResponse.json(
      { message: wikiImageUnavailableMessage },
      { status: 502 },
    );
  }
}
