import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getWikiImageErrorMessage,
  wikiImageMaxUploadBodyBytes,
  wikiImageUploadRequestSchema,
  wikiImageUploadResponseSchema,
} from "../../../../wiki/wikiImageModel";
import { getWikiImageApiBaseUrl } from "../../../../wiki/wikiImageServerApi";
import { trimTrailingSlashes } from "../../../../wiki/wikiApiModel";
import { parseWithSchemaLog } from "../../../../zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../../wikiRouteSupport";

const validateUploadContentLength = (headers: Headers): Response | null => {
  const contentLength = headers.get("content-length");

  if (contentLength === null) {
    return jsonErrorResponse("Wiki image upload content length is required.", 411);
  }

  const parsedLength = Number(contentLength);

  if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
    return jsonErrorResponse("Wiki image upload content length is invalid.", 400);
  }

  if (parsedLength > wikiImageMaxUploadBodyBytes) {
    return jsonErrorResponse("Wiki image upload body is too large.", 413);
  }

  return null;
};

export async function POST(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki image API is not configured.", 500);
  }

  const contentLengthError = validateUploadContentLength(request.headers);

  if (contentLengthError) {
    return contentLengthError;
  }

  try {
    const body = wikiImageUploadRequestSchema.parse(await request.json());
    const apiResponse = await fetch(`${trimTrailingSlashes(baseUrl)}/image/upload`, {
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
