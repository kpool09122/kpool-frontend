import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  playlistCreateSchema,
  playlistSaveSchema,
  playlistCreatedSchema,
  playlistListSchema,
  playlistDetailSchema,
} from "@/gateways/wiki/wikiPlaylists";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders } from "../wikiRouteSupport";
const headers = { "Cache-Control": "private, no-store" };
const fail = (status: number, inactive = false) =>
  NextResponse.json(
    {
      message: "Playlist operation unavailable.",
      ...(inactive ? { code: "principal_inactive" } : {}),
    },
    { status, headers },
  );
export async function playlistRoute(
  request: NextRequest,
  method: "GET" | "POST" | "PUT" | "DELETE",
  id?: string,
) {
  if (!request.headers.get("cookie")) return fail(401);
  if (id !== undefined && !z.string().uuid().safeParse(id).success)
    return fail(422);
  let body: unknown;
  if (method === "POST" || method === "PUT") {
    const input = await request.json().catch(() => null);
    const result = (
      method === "POST" ? playlistCreateSchema : playlistSaveSchema
    ).safeParse(input);
    if (!result.success) return fail(422);
    body = result.data;
  }
  const base = getWikiPrivateApiBaseUrl();
  if (!base) return fail(503);
  let upstream: Response | undefined;
  let response: Response;
  try {
    upstream = await fetch(
      `${base}/my/playlists${id ? `/${encodeURIComponent(id)}` : ""}`,
      {
        method,
        cache: "no-store",
        headers: {
          ...getForwardedWikiApiHeaders(request.headers),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!upstream.ok) {
      const problem =
        upstream.status === 403
          ? await upstream.json().catch(() => null)
          : null;
      const inactive =
        typeof problem === "object" &&
        problem !== null &&
        "code" in problem &&
        problem.code === "principal_inactive";
      response = fail(
        upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502,
        inactive,
      );
    } else if (method === "PUT" || method === "DELETE")
      response =
        upstream.status === 204
          ? new Response(null, { status: 204, headers })
          : fail(502);
    else {
      const result = (
        method === "POST"
          ? playlistCreatedSchema
          : id
            ? playlistDetailSchema
            : playlistListSchema
      ).safeParse(await upstream.json());
      response =
        result.success && upstream.status === (method === "POST" ? 201 : 200)
          ? NextResponse.json(result.data, { status: upstream.status, headers })
          : fail(502);
    }
  } catch {
    response = fail(502);
  }
  for (const cookie of upstream?.headers.getSetCookie() ?? [])
    response.headers.append("Set-Cookie", cookie);
  return response;
}
