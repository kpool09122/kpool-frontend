import { NextResponse, type NextRequest } from "next/server";

import {
  createWikiDraftImageReviewUrl,
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
  wikiImageReviewResponseSchema,
} from "@kpool/wiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
  wikiImageUnavailableMessage,
} from "../../wikiRouteSupport";

type WikiDraftImageReviewRouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

const hasReviewRequestHeader = (request: NextRequest): boolean =>
  request.headers.get(wikiDraftImageReviewCsrfHeaderName) ===
  wikiDraftImageReviewCsrfHeaderValue;

export const createWikiDraftImageReviewRoute =
  (action: "approve" | "reject", responseLabel: string) =>
  async (request: NextRequest, context: WikiDraftImageReviewRouteContext) => {
    if (!hasReviewRequestHeader(request)) {
      return jsonErrorResponse("Wiki image review request is not allowed.", 403);
    }

    const baseUrl = getWikiPrivateApiBaseUrl();

    if (!baseUrl) {
      return jsonErrorResponse("Wiki image API is not configured.", 500);
    }

    try {
      const { imageId } = await context.params;
      const apiResponse = await fetch(
        createWikiDraftImageReviewUrl({
          action,
          baseUrl,
          imageIdentifier: imageId,
        }),
        {
          method: "POST",
          headers: getForwardedWikiApiHeaders(request.headers),
          cache: "no-store",
        },
      );
      const body = await readJsonResponseBody(apiResponse);

      if (!apiResponse.ok) {
        console.error(`Wiki draft image ${action} backend request failed`, {
          status: apiResponse.status,
        });

        return NextResponse.json(
          { message: wikiImageUnavailableMessage },
          { status: apiResponse.status },
        );
      }

      return NextResponse.json(
        parseWithSchemaLog(responseLabel, wikiImageReviewResponseSchema, body),
      );
    } catch (error) {
      console.error(`Wiki draft image ${action} route failed`, error);

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: 502 },
      );
    }
  };
