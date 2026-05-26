import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  createWikiPrincipalCreateUrl,
  getWikiPrincipalApiBaseUrl,
  getWikiPrincipalErrorMessage,
  getWikiPrincipalResponseErrorMessage,
  wikiPrincipalUnavailableMessage,
  wikiPrincipalCreateRequestSchema,
  wikiPrincipalSummarySchema,
} from "@/gateways/wiki/wikiPrincipal";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../../wikiRouteSupport";

export async function POST(request: NextRequest) {
  const baseUrl = getWikiPrincipalApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki principal API is not configured.", 500);
  }

  try {
    const body = parseWithSchemaLog("wiki principal create request", wikiPrincipalCreateRequestSchema, await request.json());
    const apiResponse = await fetch(createWikiPrincipalCreateUrl(baseUrl), {
      method: "POST",
      headers: {
        ...getForwardedWikiApiHeaders(request.headers),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        {
          message: getWikiPrincipalResponseErrorMessage({
            status: apiResponse.status,
            data: responseBody,
          }),
        },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki principal create response",
        wikiPrincipalSummarySchema,
        responseBody,
      ),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: getWikiPrincipalErrorMessage(error) },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { message: wikiPrincipalUnavailableMessage },
      { status: 502 },
    );
  }
}
