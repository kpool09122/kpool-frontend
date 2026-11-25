import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAccountApiBaseUrl } from "@/gateways/account/accountApi";
import { getApiErrorMessage } from "@/gateways/support/apiError";
import { accountApiUnavailableResponse, getForwardHeaders, readResponseBody } from "./routeSupport";

export const proxySnapshot = async (request: NextRequest, path: string, schema: z.ZodTypeAny | "document", bodySchema?: z.ZodTypeAny) => {
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl) return accountApiUnavailableResponse();
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
    cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
    return response;
  };
  let payload: unknown;
  if (bodySchema) {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return respond({ message: "Invalid request." }, 422);
    payload = parsed.data;
  }
  try {
    const upstream = await fetch(`${baseUrl}/${path}`, { method: request.method, headers: getForwardHeaders(request, payload !== undefined), cache: "no-store", ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    cookies.push(...upstream.headers.getSetCookie());
    if (!upstream.ok) {
      const body = await readResponseBody(upstream);
      const code = z.object({ code: z.string().max(120).optional() }).safeParse(body);
      return respond({ message: upstream.status >= 500 ? "Account API is temporarily unavailable." : getApiErrorMessage(body, "Account request failed."), ...(upstream.status < 500 && code.success && code.data.code ? { code: code.data.code } : {}) }, upstream.status);
    }
    if (schema === "document") {
      const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
      const type = upstream.headers.get("content-type")?.split(";")[0];
      const safeType = type && ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(type) ? type : "application/octet-stream";
      headers.set("Content-Type", safeType);
      headers.set("Content-Disposition", safeType === "application/octet-stream" || new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline");
      headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
      cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
      return new Response(upstream.body, { status: upstream.status, headers });
    }
    const parsed = schema.safeParse(await readResponseBody(upstream));
    if (!parsed.success) return respond({ message: "Account API response did not match the expected schema." }, 502);
    return respond(parsed.data, upstream.status);
  } catch {
    return respond({ message: "Account API is temporarily unavailable." }, 502);
  }
};
