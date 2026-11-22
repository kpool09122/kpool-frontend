import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { getMonetizationApiBaseUrl, groupsSchema, membersSchema, monetizationUnavailable } from "@/gateways/monetization/monetizationPrincipal";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { readApiErrorBody } from "@/gateways/support/apiError";
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const validateSession = (request: NextRequest, mutation = false) => {
  if (!request.headers.get("cookie")) return json({ message: monetizationUnavailable }, 401);
  if (mutation) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const expected = host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
    if ((origin && origin !== expected) || request.headers.get("sec-fetch-site") === "cross-site") return json({ message: monetizationUnavailable }, 403);
    if (!request.headers.get("x-xsrf-token")) return json({ message: monetizationUnavailable }, 419);
  }
  return null;
};
export const forwardedHeaders = (request: NextRequest): Record<string, string> => ({
  Accept: "application/json", Cookie: request.headers.get("cookie") ?? "",
  ...(request.headers.get("accept-language") ? { "Accept-Language": request.headers.get("accept-language")! } : {}),
  ...getCsrfForwardHeaders(request.headers),
});
const withCookies = (response: NextResponse, upstream: Response) => {
  for (const cookie of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
};
export const forwardMonetization = async (request: NextRequest, path: string, schema: z.ZodType, method: "GET" | "POST" = "GET") => {
  const rejected = validateSession(request, method !== "GET");
  if (rejected) return rejected;
  const base = getMonetizationApiBaseUrl();
  if (!base) return json({ message: monetizationUnavailable }, 503);
  try {
    const upstream = await fetch(`${base}${path}`, { method, headers: forwardedHeaders(request), cache: "no-store", redirect: "manual" });
    const payload = await readApiErrorBody(upstream);
    if (!upstream.ok) {
      // Only machine-readable, public conflicts survive this boundary. No debug message/trace.
      const code = payload && typeof payload === "object" && "code" in payload && ["last_active_manager", "principal_status_change_forbidden"].includes(String(payload.code)) ? payload.code : undefined;
      return withCookies(json({ message: monetizationUnavailable, ...(code ? { code } : {}) }, upstream.status >= 400 ? upstream.status : 502), upstream);
    }
    const parsed = schema.safeParse(payload);
    return withCookies(parsed.success ? json(parsed.data, upstream.status) : json({ message: monetizationUnavailable }, 502), upstream);
  } catch {
    return json({ message: monetizationUnavailable }, 502);
  }
};
/** Effective Account is derived by the backend. Never forward selection query parameters. */
export const loadGroupList = async (baseUrl: string, headers: Record<string, string>, capture: (response: Response) => void) => {
  const groups = await fetch(`${baseUrl}/principal-groups`, { method: "GET", headers: { ...headers }, cache: "no-store", redirect: "manual" });
  capture(groups);
  if (!groups.ok) throw groups;
  const groupData = groupsSchema.safeParse(await groups.json());
  if (!groupData.success) throw groupData.error;
  const members = await fetch(`${baseUrl}/members`, { method: "GET", headers: { ...headers }, cache: "no-store", redirect: "manual" });
  capture(members);
  if (!members.ok) throw members;
  const memberData = membersSchema.safeParse(await members.json());
  if (!memberData.success) throw memberData.error;
  return { groups: groupData.data.principalGroups, users: memberData.data.members };
};
