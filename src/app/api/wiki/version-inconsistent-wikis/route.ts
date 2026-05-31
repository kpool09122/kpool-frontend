import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createVersionInconsistentWikisUrl,
  defaultWikiDraftPerPage,
  getDraftWikiErrorMessage,
  wikiVersionInconsistentWikiListResponseSchema,
} from "@/gateways/wiki/draftWiki";
import { getWikiImageApiBaseUrl } from "@/gateways/wiki/wikiImageServerApi";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  parsePositiveIntegerParam,
  readJsonResponseBody,
} from "../wikiRouteSupport";

const sortParamSchema = z.enum(["updatedAt", "name"]);
const orderParamSchema = z.enum(["asc", "desc"]);

const parseEnumParam = <T extends z.ZodEnum<[string, ...string[]]>>(
  schema: T,
  value: string | null,
): z.infer<T> | undefined => {
  if (value === null) {
    return undefined;
  }

  const result = schema.safeParse(value);

  return result.success ? result.data : undefined;
};

export async function GET(request: NextRequest) {
  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki draft API is not configured.", 500);
  }

  try {
    const apiResponse = await fetch(
      createVersionInconsistentWikisUrl({
        baseUrl,
        order: parseEnumParam(orderParamSchema, request.nextUrl.searchParams.get("order")),
        page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
        perPage: parsePositiveIntegerParam(
          request.nextUrl.searchParams.get("perPage"),
          defaultWikiDraftPerPage,
        ),
        resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
        sort: parseEnumParam(sortParamSchema, request.nextUrl.searchParams.get("sort")),
      }),
      {
        method: "GET",
        headers: getForwardedWikiApiHeaders(request.headers),
        cache: "no-store",
      },
    );
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getDraftWikiErrorMessage({ response: { status: apiResponse.status, data: body } }) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(
      parseWithSchemaLog(
        "wiki version inconsistent list response",
        wikiVersionInconsistentWikiListResponseSchema,
        body,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      { message: getDraftWikiErrorMessage(error) },
      { status: 502 },
    );
  }
}
