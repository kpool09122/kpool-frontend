import { NextResponse, type NextRequest } from "next/server";
import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  defaultWikiDraftPerPage,
  type WikiDraftWikiStatus,
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

type CreateDraftWikiListUrl = (params: {
  baseUrl: string;
  page: number;
  perPage: number;
  resourceType?: string;
  statuses: readonly WikiDraftWikiStatus[];
  translationSetIdentifier?: string;
}) => string;

export const createDraftWikiListRouteGetHandler = (
  createDraftWikiListUrl: CreateDraftWikiListUrl,
  routeLogName: string,
  parseContext: string,
) => async (request: NextRequest) => {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  const statusesResult = z
    .array(wikiPrivateApiTypes.schemas.DraftWikiStatus)
    .min(1)
    .safeParse(request.nextUrl.searchParams.getAll("statuses[]"));

  if (!statusesResult.success) {
    return jsonErrorResponse("At least one valid draft wiki status is required.", 400);
  }

  try {
    const apiResponse = await fetch(
      createDraftWikiListUrl({
        baseUrl,
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiDraftPerPage,
        ),
        resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
        statuses: statusesResult.data,
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
      console.error(`${routeLogName} backend request failed`, {
        status: apiResponse.status,
      });

      return NextResponse.json(
        { message: wikiDraftUnavailableMessage },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        parseContext,
        wikiDraftWikiListResponseSchema,
        body,
      ),
    );
  } catch (error) {
    console.error(`${routeLogName} route failed`, error);

    return NextResponse.json(
      { message: wikiDraftUnavailableMessage },
      { status: 502 },
    );
  }
};
