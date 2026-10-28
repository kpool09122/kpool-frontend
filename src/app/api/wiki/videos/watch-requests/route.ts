import { NextResponse, type NextRequest } from "next/server";
import {
  watchRequestIdsSchema,
  watchRequestsSchema,
} from "@/gateways/wiki/wikiVideoWatchRequests";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";
const headers = { "Cache-Control": "private, no-store" };
const fail = (status: number) =>
  NextResponse.json(
    { message: "Watch request state unavailable." },
    { status, headers },
  );
export async function GET(request: NextRequest) {
  if (!request.headers.get("cookie")) return fail(401);
  const ids = watchRequestIdsSchema.safeParse(
    request.nextUrl.searchParams.getAll("videoLinkIds[]"),
  );
  if (!ids.success) return fail(422);
  const base = getWikiPrivateApiBaseUrl();
  if (!base) return fail(503);
  let upstream: Response | undefined;
  let response: Response;
  try {
    const params = new URLSearchParams(
      ids.data.map((id) => ["videoLinkIds[]", id]),
    );
    upstream = await fetch(`${base}/my/video-watch-requests?${params}`, {
      cache: "no-store",
      headers: getForwardedWikiApiHeaders(request.headers),
    });
    if (!upstream.ok) response = fail(upstream.status);
    else {
      const result = watchRequestsSchema.safeParse(await upstream.json());
      response =
        result.success &&
        ids.data.every((id) =>
          result.data.videoWatchRequests.some(
            (item) => item.videoLinkIdentifier === id,
          ),
        )
          ? NextResponse.json(
              {
                videoWatchRequests: result.data.videoWatchRequests.filter(
                  (item) => ids.data.includes(item.videoLinkIdentifier),
                ),
              },
              { headers },
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
