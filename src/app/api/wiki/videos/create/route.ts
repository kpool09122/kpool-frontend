import { NextResponse, type NextRequest } from "next/server";
import { normalizeVideoUrl, trimTrailingSlashes } from "@kpool/wiki";
import { wikiVideoCreateSchema } from "@/gateways/wiki/wikiVideoCreateModel";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";

const fail = (status: number) =>
  NextResponse.json({ message: "Video creation failed." }, { status });
export async function POST(request: NextRequest) {
  if (!request.headers.get("cookie")) return fail(401);
  if (!request.headers.get("x-xsrf-token")) return fail(403);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail(403);
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl) return fail(503);
  const input = await request.json().catch(() => null);
  const parsed = wikiVideoCreateSchema.safeParse(input);
  if (!parsed.success) return fail(422);
  try {
    const upstream = await fetch(
      `${trimTrailingSlashes(baseUrl)}/video-link/create`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          ...getForwardedWikiApiHeaders(request.headers),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsed.data,
          url: normalizeVideoUrl(parsed.data.url),
        }),
      },
    );
    const response =
      upstream.status === 204
        ? new NextResponse(null, { status: 204 })
        : fail(upstream.ok ? 502 : upstream.status);
    for (const cookie of upstream.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return fail(502);
  }
}
