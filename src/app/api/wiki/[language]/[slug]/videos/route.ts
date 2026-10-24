import { NextResponse, type NextRequest } from "next/server";
import { wikiResourceTypeSchema, withWikiApiPrefix } from "@kpool/wiki";
import { z } from "zod";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  wikiVideoDurationFilterSchema,
  wikiVideoDurationSearchParams,
} from "@/gateways/wiki/wikiVideoFilters";
import {
  wikiVideosResponseSchema,
  wikiVideosUnavailableMessage,
} from "@/gateways/wiki/wikiVideos";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ language: string; slug: string }> },
) {
  const { language, slug } = await context.params;
  const resourceType = wikiResourceTypeSchema.safeParse(
    request.nextUrl.searchParams.get("resourceType"),
  );
  const durationInput: Record<string, number> = {};
  for (const key of ["minDurationSeconds", "maxDurationSeconds"] as const) {
    const value = request.nextUrl.searchParams.get(key);
    if (request.nextUrl.searchParams.has(`${key}[]`)) {
      durationInput[key] = NaN;
    } else if (value !== null) {
      durationInput[key] = /^\d+$/.test(value) ? Number(value) : NaN;
    }
  }
  const duration = wikiVideoDurationFilterSchema.safeParse(durationInput);
  if (
    !resourceType.success ||
    !duration.success ||
    !z.enum(["ja", "en", "ko"]).safeParse(language).success ||
    !slug
  ) {
    return NextResponse.json(
      { message: "Invalid wiki identity." },
      { status: 400 },
    );
  }
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl)
    return NextResponse.json(
      { message: wikiVideosUnavailableMessage },
      { status: 503 },
    );
  try {
    const durationQuery = wikiVideoDurationSearchParams(duration.data).toString();
    // Public reads must not depend on, or forward, the viewer's authentication.
    const response = await fetch(
      `${withWikiApiPrefix(baseUrl)}/wiki/${encodeURIComponent(language)}/${resourceType.data}/${encodeURIComponent(slug)}/videos${durationQuery ? `?${durationQuery}` : ""}`,
      {
        headers: { Accept: "application/json" },
        credentials: "omit",
        cache: "no-store",
      },
    );
    if (!response.ok)
      return NextResponse.json(
        { message: wikiVideosUnavailableMessage },
        { status: response.status === 404 ? 404 : 502 },
      );
    const result = wikiVideosResponseSchema.safeParse(await response.json());
    if (!result.success)
      return NextResponse.json(
        { message: wikiVideosUnavailableMessage },
        { status: 502 },
      );
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: wikiVideosUnavailableMessage },
      { status: 502 },
    );
  }
}
