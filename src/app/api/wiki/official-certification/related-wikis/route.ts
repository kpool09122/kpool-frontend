import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  listRelatedWikis,
  officialCertificationUnavailableMessage,
} from "@/gateways/wiki/officialCertification";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  jsonErrorResponse,
} from "../../wikiRouteSupport";

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

  const resourceType = request.nextUrl.searchParams.get("resourceType");
  const translationSetIdentifier = request.nextUrl.searchParams.get("translationSetIdentifier");

  if (!resourceType || !translationSetIdentifier) {
    return jsonErrorResponse("resourceType and translationSetIdentifier are required.", 400);
  }

  try {
    const result = await listRelatedWikis(client, {
      resourceType,
      translationSetIdentifier,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list related wikis.", {
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: officialCertificationUnavailableMessage },
      { status: 502 },
    );
  }
}
