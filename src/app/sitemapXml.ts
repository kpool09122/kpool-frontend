import { buildWikiPath } from "@kpool/wiki";
import { getPublicSiteOrigin } from "@/config/publicSite";
import type { SitemapWiki } from "@/gateways/wiki/sitemapWikis";
import type { SitemapAnnouncement } from "@/gateways/site-management/sitemapAnnouncements";
import { supportedLocales } from "@/i18n/locales";

export const sitemapMaxUrls = 50_000;
export const sitemapMaxBytes = 50 * 1024 * 1024;
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
const urlsetOpen = `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
const urlsetClose = "</urlset>\n";
const byteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;
export const escapeSitemapXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

export const buildSitemapDocuments = (
  wikis: readonly SitemapWiki[],
  announcements: readonly SitemapAnnouncement[] = [],
) => {
  const origin = getPublicSiteOrigin();
  if (!origin) return { status: "error" } as const;
  const entries = new Map<string, string | null>();
  for (const path of ["/contact", "/login", "/signup"])
    entries.set(`${origin}${path}`, null);
  for (const language of supportedLocales) {
    for (const suffix of ["", "/terms", "/privacy", "/wiki", "/announcements"])
      entries.set(`${origin}/${language}${suffix}`, null);
  }
  for (const announcement of announcements) {
    entries.set(
      `${origin}/${announcement.language}/announcements/${encodeURIComponent(announcement.identifier)}`,
      null,
    );
  }
  for (const wiki of wikis) {
    const url = `${origin}${buildWikiPath(wiki.language, wiki.slug)}`;
    const existing = entries.get(url);
    // A duplicate URL is emitted only once, using the most recent known publication.
    if (
      !entries.has(url) ||
      (wiki.lastModifiedAt &&
        (!existing ||
          new Date(wiki.lastModifiedAt).getTime() >
            new Date(existing).getTime()))
    ) {
      entries.set(url, wiki.lastModifiedAt);
    }
  }
  const documents: string[] = [];
  let rows: string[] = [];
  const envelopeBytes = byteLength(urlsetOpen + urlsetClose);
  let bytes = envelopeBytes;
  for (const [url, lastModified] of entries) {
    if (url.length > 2048) return { status: "error" } as const;
    const row = `<url><loc>${escapeSitemapXml(url)}</loc>${lastModified ? `<lastmod>${escapeSitemapXml(lastModified)}</lastmod>` : ""}</url>\n`;
    const rowBytes = byteLength(row);
    if (rowBytes + envelopeBytes > sitemapMaxBytes)
      return { status: "error" } as const;
    if (rows.length === sitemapMaxUrls || bytes + rowBytes > sitemapMaxBytes) {
      documents.push(urlsetOpen + rows.join("") + urlsetClose);
      rows = [];
      bytes = envelopeBytes;
    }
    rows.push(row);
    bytes += rowBytes;
  }
  if (rows.length) documents.push(urlsetOpen + rows.join("") + urlsetClose);
  if (documents.length > sitemapMaxUrls) return { status: "error" } as const;
  return { status: "success", documents } as const;
};

export const buildSitemapIndex = (count: number): string =>
  `${xmlHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from({ length: count }, (_, id) => `<sitemap><loc>${escapeSitemapXml(`${getPublicSiteOrigin()}/sitemaps/${id}.xml`)}</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`;
