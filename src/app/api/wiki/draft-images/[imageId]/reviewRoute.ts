import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiDraftImageReviewUrl,
  getWikiImageErrorMessage,
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
  wikiImageReviewResponseSchema,
} from "@kpool/wiki";
import { getWikiImageApiBaseUrl } from "@/gateways/wiki/wikiImageServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
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

    const baseUrl = getWikiImageApiBaseUrl();

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
        return NextResponse.json(
          { message: getWikiImageErrorMessage({ response: { status: apiResponse.status, data: body } }) },
          { status: apiResponse.status },
        );
      }

      return NextResponse.json(
        parseWithSchemaLog(responseLabel, wikiImageReviewResponseSchema, body),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { message: getWikiImageErrorMessage(error) },
          { status: 502 },
        );
      }

      return NextResponse.json(
        { message: getWikiImageErrorMessage(error) },
        { status: 502 },
      );
    }
  };
