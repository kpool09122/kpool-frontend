import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { wikiPrivateApiTypes } from "@kpool/types";
import {
  getIdentityApiBaseUrl,
  parseAuthenticatedIdentitySummary,
} from "@/gateways/identity/identityApi";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { officialVideoWikiSchema } from "@/gateways/wiki/officialVideoInbox";
import { wikiVideosResponseSchema } from "@/gateways/wiki/wikiVideos";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";

const privateHeaders = { "Cache-Control": "private, no-store" };
const fail = (status: number) =>
  NextResponse.json(
    { message: "Official video inbox is unavailable." },
    { status, headers: privateHeaders },
  );
export async function GET(request: NextRequest) {
  if (!request.headers.get("cookie")) return fail(401);
  const ids = request.nextUrl.searchParams.getAll("wikiIdentifier");
  if (
    ids.length > 1 ||
    (ids.length && !z.string().uuid().safeParse(ids[0]).success)
  )
    return fail(422);
  const base = getWikiPrivateApiBaseUrl();
  const identityBase = getIdentityApiBaseUrl();
  if (!base || !identityBase) return fail(503);
  const cookies: string[] = [];
  const forwarded = new Headers(request.headers);
  const finish = (response: NextResponse) => {
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const load = async (url: string, authenticated = true) => {
    const response = await fetch(url, {
      headers: authenticated
        ? getForwardedWikiApiHeaders(forwarded)
        : { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
    });
    if (authenticated) {
      const values = response.headers.getSetCookie();
      cookies.push(...values);
      const jar = new Map(
        (forwarded.get("cookie") ?? "")
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((pair) => [pair.split("=")[0], pair]),
      );
      for (const value of values) {
        const pair = value.split(";")[0];
        jar.set(pair.split("=")[0], pair);
      }
      forwarded.set("cookie", [...jar.values()].join("; "));
    }
    return response;
  };
  const errorStatus = (response: Response) =>
    [401, 403, 404].includes(response.status) ? response.status : 502;
  try {
    const authResponse = await load(`${identityBase}/auth/me`);
    if (!authResponse.ok) return finish(fail(errorStatus(authResponse)));
    const identity = parseAuthenticatedIdentitySummary(
      await authResponse.json(),
    );
    if (
      identity.delegationIdentifier !== null ||
      !identity.accountIdentifier ||
      identity.accountPrincipalStatus !== "active" ||
      identity.account?.status !== "active"
    )
      return finish(fail(403));
    const ownedResponse = await load(`${base}/my/owned-wikis?perPage=100`);
    if (!ownedResponse.ok) return finish(fail(errorStatus(ownedResponse)));
    const owned =
      wikiPrivateApiTypes.schemas.ListMyOwnedWikisResponseBody.safeParse(
        await ownedResponse.json(),
      );
    if (!owned.success) return finish(fail(502));
    if (owned.data.accountCategory !== "talent") return finish(fail(403));
    // All primary talent wikis are returned unpaginated by the backend. Ownership
    // is its official-certification invariant; never infer it from editor roles.
    const wikis = owned.data.primaryOwnedWikis.flatMap((wiki) => {
      const parsed = officialVideoWikiSchema.safeParse(wiki);
      return parsed.success && wiki.publishedAt !== null ? [parsed.data] : [];
    });
    if (!ids.length)
      return finish(NextResponse.json({ wikis }, { headers: privateHeaders }));
    const wiki = wikis.find((wiki) => wiki.wikiIdentifier === ids[0]);
    if (!wiki) return finish(fail(403));
    const videosResponse = await load(
      `${base}/wiki/${wiki.language}/talent/${encodeURIComponent(wiki.slug)}/videos?recentWatchRequestsOnly=true&sortByWatchRequests=true`,
      false,
    );
    if (!videosResponse.ok) return finish(fail(errorStatus(videosResponse)));
    const videos = wikiVideosResponseSchema.safeParse(
      await videosResponse.json(),
    );
    return finish(
      videos.success
        ? NextResponse.json(videos.data, { headers: privateHeaders })
        : fail(502),
    );
  } catch {
    return finish(fail(502));
  }
}
