import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getWikiImageApiBaseUrl,
  getWikiImageErrorMessage,
  wikiImageUploadRequestSchema,
  wikiImageUploadResponseSchema,
} from "../../../../wiki/wikiImages";
import { trimTrailingSlashes } from "../../../../wiki/wikiApiModel";
import { parseWithSchemaLog } from "../../../../zodErrorLog";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function POST(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Wiki image API is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = wikiImageUploadRequestSchema.parse(await request.json());
    const apiResponse = await fetch(`${trimTrailingSlashes(baseUrl)}/image/upload`, {
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
          message: getWikiImageErrorMessage({
            response: { status: apiResponse.status, data: responseBody },
          }),
        },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki image upload response",
        wikiImageUploadResponseSchema,
        responseBody,
      ),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: getWikiImageErrorMessage(error) },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { message: getWikiImageErrorMessage(error) },
      { status: 502 },
    );
  }
}
