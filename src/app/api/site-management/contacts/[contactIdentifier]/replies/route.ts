import { NextResponse, type NextRequest } from "next/server";

import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { getApiErrorBody, readApiErrorBody } from "@/gateways/support/apiError";
import { siteManagementContactsUnavailableMessage } from "@/gateways/site-management/siteManagementContacts";

type RouteContext = { params: Promise<{ contactIdentifier: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const baseUrl = getSiteManagementApiBaseUrl();
  if (!baseUrl) return NextResponse.json({ message: siteManagementContactsUnavailableMessage }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const { contactIdentifier } = await context.params;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...getCsrfForwardHeaders(request.headers),
  };
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.Cookie = cookie;
  if (language) headers["Accept-Language"] = language;

  try {
    const upstream = await fetch(`${baseUrl}/contacts/${encodeURIComponent(contactIdentifier)}/replies`, {
      method: "POST",
      headers,
      body: await request.text(),
      cache: "no-store",
    });
    const response = upstream.ok
      ? new NextResponse(null, { status: upstream.status, headers: { "Cache-Control": "no-store" } })
      : NextResponse.json(getApiErrorBody(await readApiErrorBody(upstream), siteManagementContactsUnavailableMessage), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    for (const value of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", value);
    return response;
  } catch {
    return NextResponse.json({ message: siteManagementContactsUnavailableMessage }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
