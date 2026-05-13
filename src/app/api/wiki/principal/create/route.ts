import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { parseWithSchemaLog } from "../../../../zodErrorLog";
import {
  createWikiPrincipalCreateUrl,
  getWikiPrincipalApiBaseUrl,
  getWikiPrincipalErrorMessage,
  wikiPrincipalCreateRequestSchema,
  wikiPrincipalSummarySchema,
} from "../../../../wiki/wikiPrincipal";
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
    const body = wikiPrincipalCreateRequestSchema.parse(await request.json());
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
          message: getWikiPrincipalErrorMessage({
            response: { status: apiResponse.status, data: responseBody },
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
      { message: getWikiPrincipalErrorMessage(error) },
      { status: 502 },
    );
  }
}
