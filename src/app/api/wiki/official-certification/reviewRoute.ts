import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  officialCertificationUnavailableMessage,
  reviewOfficialCertification,
  type OfficialCertificationAction,
} from "@/gateways/wiki/officialCertification";
import {
  wikiDraftReviewCsrfHeaderName,
  wikiDraftReviewCsrfHeaderValue,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
} from "../wikiRouteSupport";

const hasReviewRequestHeader = (request: NextRequest): boolean =>
  request.headers.get(wikiDraftReviewCsrfHeaderName) === wikiDraftReviewCsrfHeaderValue;

export const createOfficialCertificationReviewRoute =
  (action: OfficialCertificationAction) =>
  async (request: NextRequest) => {
    if (!hasReviewRequestHeader(request)) {
      return NextResponse.json(
        { message: "Official certification review request is not allowed." },
        { status: 403 },
      );
    }

    const client = createOfficialCertificationApiClient(
      undefined,
      getForwardedWikiApiHeaders(request.headers),
    );

    if (!client) {
      return NextResponse.json(
        { message: "Official certification API is not configured." },
        { status: 500 },
      );
    }

    try {
      const result = await reviewOfficialCertification(client, await request.json(), action);

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error(`Failed to ${action} official certification.`, {
        status: getWikiRouteErrorStatus(error),
      });

      return NextResponse.json(
        { message: officialCertificationUnavailableMessage },
        { status: 502 },
      );
    }
  };
