import type { NextRequest } from "next/server";
import { z } from "zod";

import { getSiteManagementApiBaseUrl, parseMyContactDetailResponse } from "@/gateways/contact/contactApi";
import { contactResponse, getForwardHeaders, getRouteErrorBody, readResponseBody, unavailableResponse } from "../../routeSupport";

type RouteContext = { params: Promise<{ contactIdentifier: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { contactIdentifier } = await context.params;
  if (!z.string().uuid().safeParse(contactIdentifier).success) return contactResponse({ message: "Invalid contact identifier." }, 422);
  const baseUrl = getSiteManagementApiBaseUrl();
  if (!baseUrl) return unavailableResponse();
  const cookies: string[] = [];
  try {
    const response = await fetch(`${baseUrl}/my/contact/${encodeURIComponent(contactIdentifier)}`, { method: "GET", headers: getForwardHeaders(request), cache: "no-store" });
    cookies.push(...response.headers.getSetCookie());
    const body = await readResponseBody(response);
    if (!response.ok) return contactResponse(getRouteErrorBody(response.status, body), response.status, cookies);
    return contactResponse(parseMyContactDetailResponse(body), response.status, cookies);
  } catch (error) {
    return contactResponse({ message: error instanceof z.ZodError ? "Contact API response did not match the expected schema." : "Contact API is temporarily unavailable." }, 502, cookies);
  }
}
