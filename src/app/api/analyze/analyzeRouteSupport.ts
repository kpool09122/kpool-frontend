import { analyzeApiTypes } from "@kpool/types";
import { NextResponse, type NextRequest } from "next/server";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";

// Endpoint paths and success schemas come from the generated Analyze contract.
export async function forwardAnalyzePrincipal(
  request: NextRequest,
  method: "get" | "post",
) {
  const endpoint = analyzeApiTypes.analyzeApi.api.find(
    (item) =>
      item.method === method &&
      item.path === (method === "get" ? "/principal/me" : "/principals"),
  )!;
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const unavailable = (status: number) =>
    respond({ message: "Analyze request could not be completed." }, status);
  const origin = process.env.KPOOL_ANALYZE_API_BASE_URL?.replace(/\/+$/, "");
  if (!origin) return unavailable(503);
  const base = origin.endsWith("/api/v1/analyze")
    ? origin
    : `${origin}/api/v1/analyze`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...getCsrfForwardHeaders(request.headers),
  };
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.Cookie = cookie;
  if (language) headers["Accept-Language"] = language;
  try {
    // Never forward caller-supplied identity/account or registration bodies.
    const upstream = await fetch(`${base}${endpoint.path}`, {
      method: method.toUpperCase(),
      headers,
      cache: "no-store",
      redirect: "error",
    });
    cookies.push(...upstream.headers.getSetCookie());
    if (!upstream.ok) return unavailable(upstream.status);
    const parsed = endpoint.response.safeParse(await upstream.json());
    return parsed.success
      ? respond(parsed.data, upstream.status)
      : unavailable(502);
  } catch {
    return unavailable(502);
  }
}
