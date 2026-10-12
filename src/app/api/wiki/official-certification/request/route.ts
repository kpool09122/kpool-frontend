import { csrfTokenMismatchResponse } from "@/app/api/csrfResponse";

import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  officialCertificationUnavailableMessage,
  requestOfficialCertification,
} from "@/gateways/wiki/officialCertification";
import {
  wikiDraftReviewCsrfHeaderName,
  wikiDraftReviewCsrfHeaderValue,
} from "@/gateways/wiki/draftWiki";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
} from "../../wikiRouteSupport";

const hasReviewRequestHeader = (request: NextRequest): boolean =>
  request.headers.get(wikiDraftReviewCsrfHeaderName) === wikiDraftReviewCsrfHeaderValue;

export async function POST(request: NextRequest) {
  if (!hasReviewRequestHeader(request)) {
    return NextResponse.json(
      { message: "Official certification request is not allowed." },
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
    const requestBody = await request.json();
    const result = await requestOfficialCertification(client, requestBody);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (getWikiRouteErrorStatus(error) === 419) return csrfTokenMismatchResponse();

    console.error("Failed to request official certification.", {
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: officialCertificationUnavailableMessage },
      { status: 502 },
    );
  }
}
