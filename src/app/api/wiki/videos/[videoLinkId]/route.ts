import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";

const fail = (status: number) =>
  NextResponse.json(
    { message: "Video deletion failed." },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ videoLinkId: string }> },
) {
  if (!request.headers.get("cookie")) return fail(401);
  if (!request.headers.get("x-xsrf-token")) return fail(403);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail(403);
  const { videoLinkId } = await context.params;
  if (!z.string().uuid().safeParse(videoLinkId).success) return fail(422);
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl) return fail(503);
  try {
    // Ownership and DELETE_VIDEO_LINK are authoritatively checked by the backend.
    const upstream = await fetch(
      `${baseUrl}/video-link/${encodeURIComponent(videoLinkId)}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: getForwardedWikiApiHeaders(request.headers),
      },
    );
    const response =
      upstream.status === 204
        ? new NextResponse(null, {
            status: 204,
            headers: { "Cache-Control": "private, no-store" },
          })
        : fail(upstream.ok ? 502 : upstream.status);
    for (const cookie of upstream.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return fail(502);
  }
}
