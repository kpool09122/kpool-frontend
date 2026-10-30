import { loadSitemapWikis } from "@/gateways/wiki/sitemapWikis";
import {
  buildSitemapDocuments,
  buildSitemapIndex,
  sitemapMaxBytes,
} from "./sitemapXml";

const unavailable = () =>
  new Response("Sitemap temporarily unavailable.", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });

export const createSitemapResponse = async (part?: number) => {
  const result = await loadSitemapWikis();
  if (result.status !== "success") return unavailable();
  const sitemap = buildSitemapDocuments(result.wikis);
  if (sitemap.status !== "success") return unavailable();
  const xml =
    part === undefined
      ? sitemap.documents.length === 1
        ? sitemap.documents[0]
        : buildSitemapIndex(sitemap.documents.length)
      : sitemap.documents[part];
  if (!xml)
    return new Response("Not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  if (new TextEncoder().encode(xml).byteLength > sitemapMaxBytes)
    return unavailable();
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
