import { getApiErrorBody, readApiErrorBody } from "@/gateways/support/apiError";
import { NextResponse, type NextRequest } from "next/server";
import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { parseSiteManagementPrincipalGroups, siteManagementUnavailableMessage } from "@/gateways/site-management/siteManagementPrincipalGroups";

export async function GET(request: NextRequest) {
  const baseUrl = getSiteManagementApiBaseUrl();
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const unavailable = (status: number) => respond({ message: siteManagementUnavailableMessage }, status);
  if (!baseUrl) return unavailable(503);
  const headers: Record<string, string> = { Accept: "application/json", ...getCsrfForwardHeaders(request.headers) };
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.Cookie = cookie;
  if (language) headers["Accept-Language"] = language;
  try {
    const upstream = await fetch(`${baseUrl}/principal-groups`, { headers, method: "GET", cache: "no-store" });
    cookies.push(...upstream.headers.getSetCookie());
    return upstream.ok
      ? respond(parseSiteManagementPrincipalGroups(await upstream.json()), 200)
      : respond(getApiErrorBody(await readApiErrorBody(upstream), siteManagementUnavailableMessage), upstream.status);
  } catch {
    return unavailable(502);
  }
}
