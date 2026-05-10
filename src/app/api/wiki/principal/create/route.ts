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

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function POST(request: NextRequest) {
  const baseUrl = getWikiPrincipalApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Wiki principal API is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = wikiPrincipalCreateRequestSchema.parse(await request.json());
    const apiResponse = await fetch(createWikiPrincipalCreateUrl(baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(request.headers.get("accept-language")
          ? { "Accept-Language": request.headers.get("accept-language") ?? "" }
          : {}),
        "Content-Type": "application/json",
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await readResponseBody(apiResponse);

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
