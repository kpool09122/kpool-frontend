import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSiteManagementApiBaseUrl, parseMyContactDetailResponse } from "@/gateways/contact/contactApi";
import { getForwardHeaders, getRouteErrorMessage, readResponseBody, unavailableResponse } from "../../routeSupport";

type RouteContext = { params: Promise<{ contactIdentifier: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const baseUrl = getSiteManagementApiBaseUrl();
  if (!baseUrl) return unavailableResponse();
  const { contactIdentifier } = await context.params;
  try {
    const response = await fetch(`${baseUrl}/contact/me/${encodeURIComponent(contactIdentifier)}`, { method: "GET", headers: getForwardHeaders(request), cache: "no-store" });
    const body = await readResponseBody(response);
    if (!response.ok) return NextResponse.json({ message: getRouteErrorMessage(response.status, body) }, { status: response.status });
    return NextResponse.json(parseMyContactDetailResponse(body), { status: response.status });
  } catch (error) {
    return NextResponse.json({ message: error instanceof z.ZodError ? "Contact API response did not match the expected schema." : "Contact API is temporarily unavailable." }, { status: 502 });
  }
}
