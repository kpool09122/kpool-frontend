import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getIdentityApiBaseUrl } from "@/gateways/identity/identityApi";
import { getAcceptLanguageForwardHeaders, getSessionForwardHeaders, readIdentityRouteResponseBody, withIdentitySetCookie } from "../auth/routeSupport";

const localResponse = (status: number) => NextResponse.json({ message: "OAuth authorization request failed." }, { status, headers: { "Cache-Control": "no-store" } });
const publicCodes = new Set(["oauth_request_expired", "oauth_request_completed"]);
// No request parameters, authorization codes, tokens or upstream error details are logged.
export const forwardOAuthRoute = async (request: NextRequest, options: {
  method: "GET" | "POST"; path: string; responseSchema: z.ZodType; requestSchema?: z.ZodType;
}) => {
  if (!request.headers.get("cookie")) return localResponse(401);
  if (options.method === "POST") {
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") return localResponse(403);
    if (!request.headers.get("x-xsrf-token")) return localResponse(419);
  }
  const baseUrl = getIdentityApiBaseUrl();
  if (!baseUrl) return localResponse(500);
  try {
    let body: unknown = undefined;
    if (options.requestSchema) {
      const parsed = options.requestSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return localResponse(422);
      body = parsed.data;
    }
    const upstream = await fetch(`${baseUrl}${options.path}`, {
      method: options.method, cache: "no-store", redirect: "manual",
      headers: { Accept: "application/json", ...getAcceptLanguageForwardHeaders(request), ...getSessionForwardHeaders(request), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await readIdentityRouteResponseBody(upstream).catch(() => null);
    if (!upstream.ok) {
      const code = typeof payload === "object" && payload !== null && "code" in payload && typeof payload.code === "string" && publicCodes.has(payload.code) ? payload.code : undefined;
      const status = upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502;
      return withIdentitySetCookie(NextResponse.json({ message: "OAuth authorization request failed.", ...(code ? { code } : {}) }, { status, headers: { "Cache-Control": "no-store" } }), upstream);
    }
    const parsed = options.responseSchema.safeParse(payload);
    return withIdentitySetCookie(parsed.success ? NextResponse.json(parsed.data, { status: upstream.status, headers: { "Cache-Control": "no-store" } }) : localResponse(502), upstream);
  } catch {
    return localResponse(502);
  }
};
