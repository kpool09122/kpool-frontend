import { NextResponse, type NextRequest } from "next/server";
import { schemas } from "@kpool/types/wiki-private-api";
import { z } from "zod";

import {
  createWikiDraftImagesUrl,
  defaultWikiImagePerPage,
  getWikiImageApiBaseUrl,
  getWikiImageErrorMessage,
  wikiDraftImageListResponseSchema,
} from "../../../wiki/wikiImages";
import { parseWithSchemaLog } from "../../../zodErrorLog";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export async function GET(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Wiki image API is not configured." },
      { status: 500 },
    );
  }

  const statusResult = schemas.DraftImageStatus.safeParse(
    request.nextUrl.searchParams.get("status"),
  );

  if (!statusResult.success) {
    return NextResponse.json(
      { message: "Valid draft image status is required." },
      { status: 400 },
    );
  }

  try {
    const apiResponse = await fetch(
      createWikiDraftImagesUrl({
        baseUrl,
        page: parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveInteger(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiImagePerPage,
        ),
        status: statusResult.data,
        wikiIdentifier: request.nextUrl.searchParams.get("wikiIdentifier") ?? undefined,
      }),
      {
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
      parseWithSchemaLog("wiki draft image list response", wikiDraftImageListResponseSchema, body),
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
