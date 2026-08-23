import { NextResponse, type NextRequest } from "next/server";

import {
  createOfficialCertificationApiClient,
  defaultOfficialCertificationPerPage,
  listMyOfficialCertifications,
  officialCertificationUnavailableMessage,
  type OfficialCertificationListStatus,
} from "@/gateways/wiki/officialCertification";
import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  parsePositiveIntegerParam,
} from "../../wikiRouteSupport";

const getStatus = (value: string | null): OfficialCertificationListStatus | undefined =>
  value === "pending" || value === "approved" ? value : undefined;

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
    const result = await listMyOfficialCertifications(client, {
      perPage: parsePositiveIntegerParam(
        request.nextUrl.searchParams.get("perPage"),
        defaultOfficialCertificationPerPage,
      ),
      status: getStatus(request.nextUrl.searchParams.get("status")),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list my official certifications.", {
      status: getWikiRouteErrorStatus(error),
    });

    return NextResponse.json(
      { message: officialCertificationUnavailableMessage },
      { status: 502 },
    );
  }
}
