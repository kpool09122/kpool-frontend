import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { parseWithSchemaLog } from "../../../../zodErrorLog";
import {
  createWikiCurrentPrincipalUrl,
  getWikiPrincipalApiBaseUrl,
  getWikiPrincipalErrorMessage,
  wikiPrincipalSummarySchema,
} from "../../../../wiki/wikiPrincipal";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../../wikiRouteSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrincipalApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki principal API is not configured.", 500);
  }

  try {
    const apiResponse = await fetch(createWikiCurrentPrincipalUrl(baseUrl), {
      method: "GET",
      headers: getForwardedWikiApiHeaders(request.headers),
      cache: "no-store",
    });
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        {
          message: getWikiPrincipalErrorMessage({
            response: { status: apiResponse.status, data: body },
          }),
        },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki current principal response", wikiPrincipalSummarySchema, body),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: getWikiPrincipalErrorMessage(error) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getWikiPrincipalErrorMessage(error) },
      { status: 502 },
    );
  }
}
