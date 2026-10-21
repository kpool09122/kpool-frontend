import { NextResponse, type NextRequest } from "next/server";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  materialSearchRequestSchema,
  materialSearchResponseSchema,
} from "@/gateways/wiki/wikiMaterialSearch";
import { getForwardedWikiApiHeaders } from "../../wikiRouteSupport";

const unavailable =
  "Material search is temporarily unavailable. Please try again.";
export async function POST(request: NextRequest) {
  const cookies: string[] = [];
  const reply = (body: unknown, status: number) => {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
    return response;
  };
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl) return reply({ message: unavailable }, 503);
  try {
    const input = materialSearchRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success)
      return reply({ message: "Invalid material search context." }, 422);
    const upstream = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/images/search-free-materials`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          ...getForwardedWikiApiHeaders(request.headers),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.data),
      },
    );
    cookies.push(...upstream.headers.getSetCookie());
    // Backend authorizes search_free_materials on IMAGE before calling Gemini.
    if (!upstream.ok) return reply({ message: unavailable }, upstream.status);
    const output = materialSearchResponseSchema.safeParse(
      await upstream.json(),
    );
    if (!output.success) return reply({ message: unavailable }, 502);
    return reply(output.data, 200);
  } catch {
    return reply({ message: unavailable }, 502);
  }
}
