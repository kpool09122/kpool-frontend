import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import {
  getMonetizationApiBaseUrl,
  monetizationUnavailable,
} from "@/gateways/monetization/monetizationPrincipal";
import { readApiErrorBody } from "@/gateways/support/apiError";
import { forwardedHeaders, json, validateSession } from "../routeSupport";
export async function forwardCard(
  request: NextRequest,
  path: string,
  schema: z.ZodType,
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
) {
  const rejected = validateSession(request, method !== "GET");
  if (rejected) return rejected;
  const base = getMonetizationApiBaseUrl();
  if (!base) return json({ message: monetizationUnavailable }, 503);
  try {
    const upstream = await fetch(`${base}/payment-methods${path}`, {
      method,
      headers: {
        ...forwardedHeaders(request),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
      redirect: "manual",
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload =
      upstream.status === 204 ? undefined : await readApiErrorBody(upstream);
    const parsed = schema.safeParse(payload);
    const code =
      upstream.status < 500 &&
      payload &&
      typeof payload === "object" &&
      "code" in payload &&
      ["recent_authentication_required", "card_registration_rejected"].includes(
        String(payload.code),
      )
        ? String(payload.code)
        : null;
    const response = !upstream.ok
      ? json(
          { message: monetizationUnavailable, ...(code ? { code } : {}) },
          upstream.status >= 400 ? upstream.status : 502,
        )
      : !parsed.success
        ? json({ message: monetizationUnavailable }, 502)
        : upstream.status === 204
          ? new NextResponse(null, {
              status: 204,
              headers: { "Cache-Control": "no-store" },
            })
          : json(parsed.data, upstream.status);
    for (const cookie of upstream.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return json({ message: monetizationUnavailable }, 502);
  }
}
