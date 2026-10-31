import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSiteManagementApiBaseUrl, replyToMyContactRequestSchema } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { getForwardHeaders, getRouteErrorBody, readResponseBody } from "../../../routeSupport";

type RouteContext = { params: Promise<{ contactIdentifier: string }> };
const unavailableMessage = "Contact API is temporarily unavailable.";

export async function POST(request: NextRequest, context: RouteContext) {
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = status === 204
      ? new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } })
      : NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const baseUrl = getSiteManagementApiBaseUrl();
  if (!baseUrl) return respond({ message: unavailableMessage }, 503);
  const { contactIdentifier } = await context.params;
  if (!z.string().uuid().safeParse(contactIdentifier).success) return respond({ message: "Invalid contact identifier." }, 422);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return respond({ message: "Invalid JSON." }, 400);
  }
  const parsed = replyToMyContactRequestSchema.safeParse(input);
  if (!parsed.success) return respond({ message: "Invalid reply content." }, 422);

  try {
    const upstream = await fetch(`${baseUrl}/my/contact/${encodeURIComponent(contactIdentifier)}/replies`, {
      method: "POST",
      headers: { ...getForwardHeaders(request), ...getCsrfForwardHeaders(request.headers), "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    cookies.push(...upstream.headers.getSetCookie());
    return upstream.ok
      ? respond(null, upstream.status)
      : respond(getRouteErrorBody(upstream.status, await readResponseBody(upstream)), upstream.status);
  } catch {
    return respond({ message: unavailableMessage }, 502);
  }
}
