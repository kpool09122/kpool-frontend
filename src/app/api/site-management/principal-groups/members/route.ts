import { NextResponse, type NextRequest } from "next/server";
import { siteManagementApiTypes } from "@kpool/types";
import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import { siteManagementMembersRequestSchema, siteManagementUnavailableMessage } from "@/gateways/site-management/siteManagementPrincipalGroups";

export async function PATCH(request: NextRequest) {
  const cookies: string[] = [];
  const respond = (body: unknown, status = 200) => {
    const response = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  const failedRefresh = (kind: "http" | "network" | "schema", status: number) => respond({ committed: true, refresh: { ok: false, kind, status, message: siteManagementUnavailableMessage } });
  const baseUrl = getSiteManagementApiBaseUrl();
  if (!baseUrl) return respond({ message: siteManagementUnavailableMessage }, 503);
  let payload;
  try { payload = siteManagementMembersRequestSchema.safeParse(await request.json()); }
  catch { return respond({ message: "Invalid membership request." }, 400); }
  if (!payload.success) return respond({ message: "Invalid membership request." }, 422);
  const headers: Record<string, string> = { Accept: "application/json", ...getCsrfForwardHeaders(request.headers) };
  const cookie = request.headers.get("cookie");
  const language = request.headers.get("accept-language");
  if (cookie) headers.Cookie = cookie;
  if (language) headers["Accept-Language"] = language;
  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/principal-groups/members`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(payload.data), cache: "no-store" });
  } catch { return respond({ message: siteManagementUnavailableMessage }, 502); }
  cookies.push(...upstream.headers.getSetCookie());
  if (!upstream.ok) return respond({ message: siteManagementUnavailableMessage }, upstream.status);
  // A successful mutation is committed even when its response/refresh is invalid.
  try {
    if (!siteManagementApiTypes.schemas.UpdatePrincipalGroupMembersResponse.safeParse(await upstream.json()).success) return failedRefresh("schema", 502);
  } catch { return failedRefresh("schema", 502); }
  // Carry rotated session cookies into the immediately following authoritative GET.
  const jar = new Map((headers.Cookie ?? "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => [part.split("=")[0], part]));
  for (const value of cookies) { const pair = value.split(";")[0]; jar.set(pair.split("=")[0], pair); }
  if (jar.size) headers.Cookie = [...jar.values()].join("; ");
  let refreshed;
  try { refreshed = await fetch(`${baseUrl}/principal-groups`, { method: "GET", headers, cache: "no-store" }); }
  catch { return failedRefresh("network", 502); }
  cookies.push(...refreshed.headers.getSetCookie());
  if (!refreshed.ok) return failedRefresh("http", refreshed.status);
  try {
    const parsed = siteManagementApiTypes.schemas.PrincipalGroupList.safeParse(await refreshed.json());
    if (!parsed.success) return failedRefresh("schema", 502);
    return respond({ committed: true, refresh: { ok: true, data: parsed.data } });
  } catch { return failedRefresh("schema", 502); }
}
