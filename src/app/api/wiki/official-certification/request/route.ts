import { NextResponse, type NextRequest } from "next/server";

import { getAccountCategoryFromIdentity } from "@/gateways/account/accountIdentity";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import {
  createOfficialCertificationApiClient,
  officialCertificationUnavailableMessage,
  requestOfficialCertification,
} from "@/gateways/wiki/officialCertification";
import { getOfficialCertificationRequestResourceTypeForAccountCategory } from "@/gateways/wiki/wikiPrincipal";
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

  const identity = await fetchAuthenticatedIdentity({
    cookieHeader: request.headers.get("cookie") ?? "",
  });
  const resourceType = getOfficialCertificationRequestResourceTypeForAccountCategory(
    getAccountCategoryFromIdentity(identity),
  );

  if (!resourceType) {
    return NextResponse.json(
      { message: "Official certification request is not allowed for this account category." },
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
    const result = await requestOfficialCertification(client, {
      ...requestBody,
      resourceType,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to request official certification.", {
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: officialCertificationUnavailableMessage },
      { status: 502 },
    );
  }
}
