import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  officialCertificationUnavailableMessage,
  syncOwnedWikiCertifications,
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

export async function PUT(request: NextRequest) {
  if (!hasReviewRequestHeader(request)) {
    return NextResponse.json(
      { message: "Owned wiki certification sync is not allowed." },
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
    const result = await syncOwnedWikiCertifications(client, await request.json());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to sync owned wiki certifications.", {
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: officialCertificationUnavailableMessage },
      { status: 502 },
    );
  }
}
