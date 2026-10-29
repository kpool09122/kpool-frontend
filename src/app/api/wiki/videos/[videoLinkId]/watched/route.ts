import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders } from "../../../wikiRouteSupport";

const headers = { "Cache-Control": "private, no-store" };
const fail = (status: number) => NextResponse.json({ message: "Video completion could not be saved." }, { status, headers });

export async function POST(request: NextRequest, context: { params: Promise<{ videoLinkId: string }> }) {
  if (!request.headers.get("cookie")) return fail(401);
  if (!request.headers.get("x-xsrf-token")) return fail(403);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail(403);
  const { videoLinkId } = await context.params;
  if (!z.string().uuid().safeParse(videoLinkId).success) return fail(422);
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl) return fail(503);
  try {
    const upstream = await fetch(`${baseUrl}/video-link/${encodeURIComponent(videoLinkId)}/watched`, {
      method: "POST", cache: "no-store", headers: getForwardedWikiApiHeaders(request.headers),
    });
    const response = upstream.status === 204 ? new NextResponse(null, { status: 204, headers }) : fail(upstream.ok ? 502 : upstream.status);
    for (const cookie of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return fail(502);
  }
}
