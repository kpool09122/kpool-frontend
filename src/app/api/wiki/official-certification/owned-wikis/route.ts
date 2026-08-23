import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  listMyOwnedWikis,
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
  parsePositiveIntegerParam,
} from "../../wikiRouteSupport";

const hasReviewRequestHeader = (request: NextRequest): boolean =>
  request.headers.get(wikiDraftReviewCsrfHeaderName) === wikiDraftReviewCsrfHeaderValue;

export async function GET(request: NextRequest) {
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
    const result = await listMyOwnedWikis(client, {
      perPage: parsePositiveIntegerParam(request.nextUrl.searchParams.get("perPage"), 100),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list my owned wikis.", {
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: officialCertificationUnavailableMessage },
      { status: 502 },
    );
  }
}

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
