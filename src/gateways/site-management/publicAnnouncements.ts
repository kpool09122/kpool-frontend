import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { announcementSchemas as schemas } from "./announcements";
import type { Locale } from "@/i18n/locales";
/** Public server read: no session, actor selectors, or private draft endpoint. */
export async function loadPublicAnnouncements(
  language: Locale,
  page: number,
  id?: string,
) {
  const base = getSiteManagementApiBaseUrl();
  if (!base) return { ok: false as const, status: 503 };
  const query = new URLSearchParams({
    language,
    ...(!id
      ? {
          page: String(page),
          perPage: "20",
          sort: "published_date",
          order: "desc",
        }
      : {}),
  });
  try {
    const response = await fetch(
      `${base}/announcements${id ? `/${encodeURIComponent(id)}` : ""}?${query}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json", "Accept-Language": language },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) return { ok: false as const, status: response.status };
    const value: unknown = await response.json();
    if (id) {
      const parsed = schemas.PublishedAnnouncementSummary.safeParse(value);
      return parsed.success
        ? { ok: true as const, detail: parsed.data }
        : { ok: false as const, status: 502 };
    }
    const parsed = schemas.ListAnnouncementsPage.safeParse(value);
    return parsed.success
      ? { ok: true as const, list: parsed.data }
      : { ok: false as const, status: 502 };
  } catch {
    return { ok: false as const, status: 502 };
  }
}
