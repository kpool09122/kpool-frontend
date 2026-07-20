import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadPublicWikiListState, type PublicWikiListQuery } from "@/gateways/wiki/publicWiki";
import { parsePositiveIntegerParam } from "../wikiRouteSupport";
import { normalizeLocale } from "../../../../i18n/locales";
import { toResourceType } from "../../../[language]/wikiListQuery";

const sortParamSchema = z.enum(["name", "updatedAt", "createdAt", "version"]);
const orderParamSchema = z.enum(["asc", "desc"]);

const parseEnumParam = <T extends z.ZodEnum<[string, ...string[]]>>(
  schema: T,
  value: string | null,
): z.infer<T> | undefined => {
  if (!value) {
    return undefined;
  }

  const result = schema.safeParse(value);

  return result.success ? result.data : undefined;
};

const optionalParam = (value: string | null): string | undefined => value ?? undefined;

export async function GET(request: NextRequest) {
  const language = normalizeLocale(request.nextUrl.searchParams.get("language"));

  if (!language) {
    return NextResponse.json({ message: "language is required." }, { status: 400 });
  }

  const query: PublicWikiListQuery = {
    order: parseEnumParam(orderParamSchema, request.nextUrl.searchParams.get("order")),
    page: parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1),
    perPage: parsePositiveIntegerParam(request.nextUrl.searchParams.get("perPage"), 10),
    resourceType: toResourceType(optionalParam(request.nextUrl.searchParams.get("resourceType"))),
    sort: parseEnumParam(sortParamSchema, request.nextUrl.searchParams.get("sort")),
  };

  const state = await loadPublicWikiListState(language, query);

  return NextResponse.json(state);
}
