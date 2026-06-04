import { NextResponse, type NextRequest } from "next/server";
import { wikiPrivateApiTypes } from "@kpool/types";

import {
  createDraftWikiApiClient,
  createWikiDraftWikisUrl,
  defaultWikiDraftPerPage,
  wikiDraftWikiListResponseSchema,
} from "@/gateways/wiki/draftWiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  parsePositiveIntegerParam,
  readJsonResponseBody,
  wikiDraftUnavailableMessage,
} from "../wikiRouteSupport";

const parseBooleanParam = (value: string | null): boolean | undefined => {
  if (value === null) {
    return undefined;
  }

  return value === "true";
};

const createClient = (request: NextRequest) =>
  createDraftWikiApiClient(
    undefined,
    getForwardedWikiApiHeaders(request.headers),
  );

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  const statusResult = wikiPrivateApiTypes.schemas.DraftWikiStatus.safeParse(
    request.nextUrl.searchParams.get("status"),
  );

  if (!statusResult.success) {
    return jsonErrorResponse("Valid draft wiki status is required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createWikiDraftWikisUrl({
        baseUrl,
        onlyMine: parseBooleanParam(request.nextUrl.searchParams.get("onlyMine")),
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiDraftPerPage,
        ),
        resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
        status: statusResult.data,
        translationSetIdentifier:
          request.nextUrl.searchParams.get("translationSetIdentifier") ?? undefined,
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      console.error("Wiki draft wikis backend request failed", {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiDraftUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki draft wiki list response",
        wikiDraftWikiListResponseSchema,
        body,
      ),
    );
  } catch (error) {
    console.error("Wiki draft wikis route failed", error);

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const client = createClient(request);

  if (!client) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  try {
    const result = await client.createWikiDraft(await request.json());

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Wiki draft wiki creation route failed", error);

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
}
