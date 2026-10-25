import {
  getApiErrorMessage,
  getBackendErrorResponse,
} from "@/gateways/support/apiError";
import { getWikiVisitorLocationSigner } from "../../visitorLocation";

import { NextResponse, type NextRequest } from "next/server";

import {
  createDraftWikiApiClient,
  reviewDraftWiki,
  type WikiDraftWorkflowAction,
  wikiDraftReviewCsrfHeaderName,
  wikiDraftReviewCsrfHeaderValue,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  wikiDraftUnavailableMessage,
} from "../../wikiRouteSupport";

type WikiDraftReviewRouteContext = {
  params: Promise<{
    wikiId: string;
  }>;
};

const hasReviewRequestHeader = (request: NextRequest): boolean =>
  request.headers.get(wikiDraftReviewCsrfHeaderName) ===
  wikiDraftReviewCsrfHeaderValue;

export const createWikiDraftReviewRoute =
  (action: WikiDraftWorkflowAction) =>
  async (request: NextRequest, context: WikiDraftReviewRouteContext) => {
    if (!hasReviewRequestHeader(request)) {
      return NextResponse.json(
        { message: "Wiki draft review request is not allowed." },
        { status: 403 },
      );
    }

    const client = createDraftWikiApiClient(
      undefined,
      getForwardedWikiApiHeaders(request.headers),
      getWikiVisitorLocationSigner(),
    );

    if (!client) {
      return NextResponse.json(
        { message: "Wiki draft API is not configured." },
        { status: 500 },
      );
    }

    const { wikiId } = await context.params;

    try {
      const body = await request.json();
      const result = await reviewDraftWiki(client, wikiId, action, body);

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error(`Failed to ${action} wiki draft.`, {
        wikiId,
        status: getWikiRouteErrorStatus(error),
      });

      const backend = getBackendErrorResponse(error);
      const status = backend?.status ?? 502;
      return NextResponse.json(
        {
          message:
            status >= 500
              ? wikiDraftUnavailableMessage
              : getApiErrorMessage(backend?.data, wikiDraftUnavailableMessage),
        },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
