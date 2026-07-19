import { NextResponse, type NextRequest } from "next/server";

import {
  createWikiImageDeletionRequestUrl,
  wikiImageDeletionRequestResponseSchema,
  wikiImageDeletionRequestSchema,
} from "@kpool/wiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
  wikiImageUnavailableMessage,
} from "../../../wikiRouteSupport";

type WikiImageDeletionRequestRouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: WikiImageDeletionRequestRouteContext,
) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki image API is not configured.", 500);
  }

  try {
    const { imageId } = await context.params;
    const apiResponse = await fetch(
      createWikiImageDeletionRequestUrl({
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
          parseWithSchemaLog("wiki image deletion request body", wikiImageDeletionRequestSchema, await request.json()),
        ),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Wiki image deletion request backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki image deletion request response", wikiImageDeletionRequestResponseSchema, body),
      { status: apiResponse.status },
    );
  } catch (error) {
    console.error("Wiki image deletion request route failed", error);

    return NextResponse.json(
      { message: wikiImageUnavailableMessage },
      { status: 502 },
    );
  }
}
