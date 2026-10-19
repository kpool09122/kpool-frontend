import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";
import {
  announcementIdentifierSchema,
  announcementInputSchema,
  announcementSchemas as schemas,
} from "@/gateways/site-management/announcements";

/** Closed endpoint matrix: never proxy arbitrary paths, query selectors or actor fields. */
export async function announcementHandler(
  request: NextRequest,
  segments: string[],
) {
  const cookies: string[] = [];
  const respond = (body: unknown, status = 200) => {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
    return response;
  };
  const fail = (status: number) =>
    respond({ message: "Announcement request failed." }, status);
  const [resource, id, action] = segments;
  const privateApi = resource === "draft-announcements";
  const method = request.method;
  if (
    !["draft-announcements", "announcements"].includes(resource) ||
    segments.length > 3 ||
    (id && !announcementIdentifierSchema.safeParse(id).success)
  )
    return fail(404);
  let schema: z.ZodType;
  if (!privateApi && method === "GET" && !action)
    schema = id
      ? schemas.PublishedAnnouncementSummary
      : schemas.ListAnnouncementsPage;
  else if (privateApi && method === "GET" && !action)
    schema = id
      ? schemas.DraftAnnouncement
      : schemas.ListDraftAnnouncementsPage;
  else if (privateApi && method === "POST" && !id)
    schema = schemas.DraftAnnouncement;
  else if (privateApi && method === "PUT" && id && !action)
    schema = schemas.DraftAnnouncement;
  else if (privateApi && method === "DELETE" && id && !action)
    schema = schemas.DeleteAnnouncementResponse;
  else if (privateApi && method === "POST" && id && action === "translate")
    schema = schemas.TranslateAnnouncementResponse;
  else if (privateApi && method === "POST" && id && action === "publish")
    schema = schemas.PublishAnnouncementResponse;
  else return fail(405);
  const base = getSiteManagementApiBaseUrl();
  if (!base) return fail(503);
  let body: string | undefined;
  if ((method === "POST" && !id) || method === "PUT") {
    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return fail(400);
    }
    const parsed = announcementInputSchema.safeParse(value);
    if (!parsed.success) return fail(422);
    body = JSON.stringify(parsed.data);
  }
  const query = new URLSearchParams();
  if (method === "GET" && !id) {
    const page = request.nextUrl.searchParams.get("page") ?? "1";
    if (!/^[1-9]\d{0,6}$/.test(page)) return fail(422);
    query.set("page", page);
    query.set("perPage", "20");
    if (!privateApi) {
      query.set("sort", "published_date");
      query.set("order", "desc");
    }
  }
  if (!privateApi) {
    const language = request.nextUrl.searchParams.get("language");
    if (!language || !["ja", "en", "ko"].includes(language)) return fail(422);
    query.set("language", language);
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (privateApi) {
    Object.assign(headers, getCsrfForwardHeaders(request.headers));
    const cookie = request.headers.get("cookie");
    if (cookie) headers.Cookie = cookie;
  }
  const language = request.headers.get("accept-language");
  if (language) headers["Accept-Language"] = language;
  if (body) headers["Content-Type"] = "application/json";
  try {
    const upstream = await fetch(
      `${base}/${segments.join("/")}${query.size ? `?${query}` : ""}`,
      { method, headers, body, cache: "no-store" },
    );
    if (privateApi) cookies.push(...upstream.headers.getSetCookie());
    if (!upstream.ok) return fail(upstream.status);
    const parsed = schema.safeParse(await upstream.json());
    return parsed.success ? respond(parsed.data) : fail(502);
  } catch {
    return fail(502);
  }
}
