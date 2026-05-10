import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { parseWithSchemaLog } from "../../../../zodErrorLog";
import {
  createWikiCurrentPrincipalUrl,
  getWikiPrincipalApiBaseUrl,
  getWikiPrincipalErrorMessage,
  wikiPrincipalSummarySchema,
} from "../../../../wiki/wikiPrincipal";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrincipalApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Wiki principal API is not configured." },
      { status: 500 },
    );
  }

  try {
    const apiResponse = await fetch(createWikiCurrentPrincipalUrl(baseUrl), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(request.headers.get("accept-language")
          ? { "Accept-Language": request.headers.get("accept-language") ?? "" }
          : {}),
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie") ?? "" }
          : {}),
      },
      cache: "no-store",
    });
    const body = await readResponseBody(apiResponse);

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
