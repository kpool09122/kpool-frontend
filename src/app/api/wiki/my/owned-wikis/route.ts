import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  listMyOwnedWikis,
  officialCertificationUnavailableMessage,
} from "@/gateways/wiki/officialCertification";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  parsePositiveIntegerParam,
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
