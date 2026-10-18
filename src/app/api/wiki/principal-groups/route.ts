import { getApiErrorBody } from "@/gateways/support/apiError";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  createWikiPrincipalGroupsUrl,
  parseWikiPrincipalGroupsResponse,
  wikiPrincipalGroupsUnavailableMessage,
} from "@/gateways/wiki/wikiPrincipalGroups";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../wikiRouteSupport";

const accountIdentifierSchema = z.string().uuid();

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki principal group API is not configured.", 500);
  }

  const requestUrl = new URL(request.url);
  const accountIdentifier = accountIdentifierSchema.safeParse(
    requestUrl.searchParams.get("accountIdentifier"),
  );

  if (!accountIdentifier.success) {
    return jsonErrorResponse("Valid accountIdentifier is required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createWikiPrincipalGroupsUrl({
        accountIdentifier: accountIdentifier.data,
        baseUrl,
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        getApiErrorBody(body, wikiPrincipalGroupsUnavailableMessage),
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parseWikiPrincipalGroupsResponse(body), { status: apiResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Wiki principal group response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: wikiPrincipalGroupsUnavailableMessage },
      { status: 502 },
    );
  }
}
