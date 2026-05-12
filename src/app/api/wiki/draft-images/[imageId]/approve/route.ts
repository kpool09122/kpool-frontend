import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createWikiDraftImageReviewUrl,
  getWikiImageApiBaseUrl,
  getWikiImageErrorMessage,
  wikiImageReviewResponseSchema,
} from "../../../../../wiki/wikiImages";
import { parseWithSchemaLog } from "../../../../../zodErrorLog";

type WikiDraftImageReviewRouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function POST(
  request: NextRequest,
  context: WikiDraftImageReviewRouteContext,
) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Wiki image API is not configured." },
      { status: 500 },
    );
  }

  try {
    const { imageId } = await context.params;
    const apiResponse = await fetch(
      createWikiDraftImageReviewUrl({
        action: "approve",
        baseUrl,
        imageIdentifier: imageId,
      }),
      {
        method: "POST",
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
      },
    );
    const body = await readResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getWikiImageErrorMessage({ response: { status: apiResponse.status, data: body } }) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog("wiki image approve response", wikiImageReviewResponseSchema, body),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: getWikiImageErrorMessage(error) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: getWikiImageErrorMessage(error) },
      { status: 502 },
    );
  }
}
