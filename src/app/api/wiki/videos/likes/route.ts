import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { likedVideoPageSchema } from "@/gateways/wiki/wikiPlaylists";
import {
  wikiVideoLikeIdsSchema,
  wikiVideoLikesUpstreamResponseSchema,
} from "@/gateways/wiki/wikiVideoLikes";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";
const fail = (status: number) =>
  NextResponse.json(
    { message: "Video likes are unavailable." },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
export async function GET(request: NextRequest) {
  if (!request.headers.get("cookie")) return fail(401);
  const ids = wikiVideoLikeIdsSchema.safeParse(
    request.nextUrl.searchParams.getAll("videoLinkIds[]"),
  );
  const hasIds = request.nextUrl.searchParams.has("videoLinkIds[]");
  const page = z.coerce.number().int().positive().safeParse(request.nextUrl.searchParams.get("page") ?? 1);
  const perPage = z.coerce.number().int().min(1).max(100).safeParse(request.nextUrl.searchParams.get("perPage") ?? 20);
  if (hasIds ? (!ids.success || !ids.data.every((id) => z.string().uuid().safeParse(id).success)) : (!page.success || !perPage.success)) return fail(422);
  const base = getWikiPrivateApiBaseUrl();
  if (!base) return fail(503);
  let upstream: Response | undefined;
  let response: Response;
  try {
    const params = new URLSearchParams(hasIds && ids.success
      ? ids.data.map((id) => ["videoLinkIds[]", id])
      : [["page", String(page.data)], ["perPage", String(perPage.data)]]);
    upstream = await fetch(`${base}/my/video-link-likes?${params}`, {
      cache: "no-store",
      headers: getForwardedWikiApiHeaders(request.headers),
    });
    if (!upstream.ok) response = fail(upstream.status);
    else {
      const result = (hasIds ? wikiVideoLikesUpstreamResponseSchema : likedVideoPageSchema).safeParse(await upstream.json());
      response = result.success
        ? NextResponse.json(
            hasIds && ids.success ? {
              likedVideoLinkIdentifiers: result.data.likedVideoLinkIdentifiers.filter((id) => ids.data.includes(id)),
            } : result.data,
            { headers: { "Cache-Control": "private, no-store" } },
          )
        : fail(502);
    }
  } catch {
    response = fail(502);
  }
  for (const cookie of upstream?.headers.getSetCookie() ?? [])
    response.headers.append("Set-Cookie", cookie);
  return response;
}
