import { NextResponse, type NextRequest } from "next/server";

import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { parseSiteManagementContactDetail, siteManagementContactsUnavailableMessage } from "@/gateways/site-management/siteManagementContacts";

type RouteContext = { params: Promise<{ contactIdentifier: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const baseUrl = getSiteManagementApiBaseUrl();
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const unavailable = (status: number) => respond({ message: siteManagementContactsUnavailableMessage }, status);
  if (!baseUrl) return unavailable(503);

  const { contactIdentifier } = await context.params;
  const headers: Record<string, string> = { Accept: "application/json", ...getCsrfForwardHeaders(request.headers) };
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.Cookie = cookie;
  if (language) headers["Accept-Language"] = language;

  try {
    const upstream = await fetch(`${baseUrl}/contacts/${encodeURIComponent(contactIdentifier)}`, { method: "GET", headers, cache: "no-store" });
    cookies.push(...upstream.headers.getSetCookie());
    return upstream.ok
      ? respond(parseSiteManagementContactDetail(await upstream.json()), 200)
      : unavailable(upstream.status);
  } catch {
    return unavailable(502);
  }
}
