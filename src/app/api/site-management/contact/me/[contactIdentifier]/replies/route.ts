import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { contactResponse, getForwardHeaders, getRouteErrorBody, readResponseBody, unavailableResponse } from "../../../routeSupport";

type RouteContext = { params: Promise<{ contactIdentifier: string }> };
const replyBodySchema = z.object({ content: z.string().min(1) }).strict();

export async function POST(request: NextRequest, context: RouteContext) {
  const { contactIdentifier } = await context.params;
  if (!z.string().uuid().safeParse(contactIdentifier).success) return contactResponse({ message: "Invalid contact identifier." }, 422);
  let body: unknown;
  try { body = await request.json(); } catch { return contactResponse({ message: "Invalid reply content." }, 422); }
  const parsed = replyBodySchema.safeParse(body);
  if (!parsed.success) return contactResponse({ message: "Invalid reply content." }, 422);
  const baseUrl = getSiteManagementApiBaseUrl();
  if (!baseUrl) return unavailableResponse();
  try {
    const upstream = await fetch(`${baseUrl}/my/contact/${encodeURIComponent(contactIdentifier)}/replies`, {
      method: "POST",
      headers: { ...getForwardHeaders(request), "Content-Type": "application/json", ...getCsrfForwardHeaders(request.headers) },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    const cookies = upstream.headers.getSetCookie();
    if (!upstream.ok) return contactResponse(getRouteErrorBody(upstream.status, await readResponseBody(upstream)), upstream.status, cookies);
    const response = new NextResponse(null, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return contactResponse({ message: "Contact API is temporarily unavailable." }, 502);
  }
}
