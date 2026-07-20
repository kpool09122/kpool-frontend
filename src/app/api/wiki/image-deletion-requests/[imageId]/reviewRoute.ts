import { NextResponse, type NextRequest } from "next/server";

import {
  createWikiImageDeletionRequestReviewUrl,
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
  wikiImageDeletionRequestApprovalResponseSchema,
  wikiImageDeletionRequestRejectionRequestSchema,
  wikiImageDeletionRequestRejectionResponseSchema,
} from "@kpool/wiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
  wikiImageUnavailableMessage,
} from "../../wikiRouteSupport";

type WikiImageDeletionRequestReviewRouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

const hasReviewRequestHeader = (request: NextRequest): boolean =>
  request.headers.get(wikiDraftImageReviewCsrfHeaderName) ===
  wikiDraftImageReviewCsrfHeaderValue;

export const createWikiImageDeletionRequestReviewRoute =
  (action: "approve" | "reject", responseLabel: string) =>
  async (request: NextRequest, context: WikiImageDeletionRequestReviewRouteContext) => {
    if (!hasReviewRequestHeader(request)) {
      return jsonErrorResponse("Wiki image deletion review request is not allowed.", 403);
    }

    const baseUrl = getWikiPrivateApiBaseUrl();

    if (!baseUrl) {
      return jsonErrorResponse("Wiki image API is not configured.", 500);
    }

    try {
      const { imageId } = await context.params;
      const requestBody =
        action === "reject"
          ? parseWithSchemaLog(
              "wiki image deletion request rejection body",
              wikiImageDeletionRequestRejectionRequestSchema,
              await request.json(),
            )
          : null;
      const responseSchema =
        action === "approve"
          ? wikiImageDeletionRequestApprovalResponseSchema
          : wikiImageDeletionRequestRejectionResponseSchema;
      const apiResponse = await fetch(
        createWikiImageDeletionRequestReviewUrl({
          action,
          baseUrl,
          imageIdentifier: imageId,
        }),
        {
          method: "POST",
          headers: {
            ...getForwardedWikiApiHeaders(request.headers),
            ...(requestBody ? { "Content-Type": "application/json" } : {}),
          },
          ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
          cache: "no-store",
        },
      );
      const body = await readJsonResponseBody(apiResponse);

      if (!apiResponse.ok) {
        console.error(`Wiki image deletion request ${action} backend request failed`, {
          status: apiResponse.status,
        });

        return NextResponse.json(
          { message: wikiImageUnavailableMessage },
          { status: apiResponse.status },
        );
      }

      return NextResponse.json(
        parseWithSchemaLog(responseLabel, responseSchema, body),
      );
    } catch (error) {
      console.error(`Wiki image deletion request ${action} route failed`, error);

      return NextResponse.json(
        { message: wikiImageUnavailableMessage },
        { status: 502 },
      );
    }
  };
