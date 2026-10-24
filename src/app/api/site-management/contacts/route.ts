import { NextResponse, type NextRequest } from "next/server";
import { getRouteErrorBody, readResponseBody } from "../contact/routeSupport";

import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { parseSiteManagementContactsPage, siteManagementContactsUnavailableMessage, siteManagementContactSenderFilterSchema } from "@/gateways/site-management/siteManagementContacts";

export async function GET(request: NextRequest) {
  const baseUrl = getSiteManagementApiBaseUrl();
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const unavailable = (status: number) => respond({ message: siteManagementContactsUnavailableMessage }, status);
  if (!baseUrl) return unavailable(503);

  const input = request.nextUrl.searchParams;
  if (!siteManagementContactSenderFilterSchema.safeParse(input.getAll("principalIdentifier")).success) return unavailable(422);
  const params = new URLSearchParams();
  for (const key of ["hasReply", "page", "perPage", "principalIdentifier"]) {
    const value = input.get(key);
    if (value !== null) params.set(key, value);
  }
  const headers: Record<string, string> = { Accept: "application/json", ...getCsrfForwardHeaders(request.headers) };
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.Cookie = cookie;
  if (language) headers["Accept-Language"] = language;

  try {
    const upstream = await fetch(`${baseUrl}/contacts?${params.toString()}`, { method: "GET", headers, cache: "no-store" });
    cookies.push(...upstream.headers.getSetCookie());
    return upstream.ok
      ? respond(parseSiteManagementContactsPage(await upstream.json()), 200)
      : respond(getRouteErrorBody(upstream.status, await readResponseBody(upstream)), upstream.status);
  } catch {
    return unavailable(502);
  }
}
