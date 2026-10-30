import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSitemapDocuments,
  buildSitemapIndex,
  escapeSitemapXml,
  sitemapMaxBytes,
} from "./sitemapXml";
import { getPublicSiteOrigin } from "@/config/publicSite";

afterEach(() => vi.unstubAllEnvs());
describe("public sitemap XML", () => {
  it("splits after 50,000 URLs and creates an XML sitemap index", () => {
    const result = buildSitemapDocuments(
      Array.from({ length: 50_000 }, (_, id) => ({
        slug: `gr-${id}`,
        language: "ja",
        resourceType: "group" as const,
        lastModifiedAt: null,
      })),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].match(/<url>/g)).toHaveLength(50_000);
    expect(result.documents[1].match(/<url>/g)).toHaveLength(9);
    const index = new DOMParser().parseFromString(
      buildSitemapIndex(2),
      "text/xml",
    );
    expect(
      [...index.querySelectorAll("loc")].map((loc) => loc.textContent),
    ).toEqual([
      "https://k-pool.app/sitemaps/0.xml",
      "https://k-pool.app/sitemaps/1.xml",
    ]);
  });
  it("splits by actual UTF-8 XML bytes before 50MB even below the URL count limit", () => {
    const result = buildSitemapDocuments(
      Array.from({ length: 28_000 }, (_, id) => ({
        slug: `gr-${"x".repeat(1900)}-${id}`,
        language: "ko",
        resourceType: "group" as const,
        lastModifiedAt: null,
      })),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.documents).toHaveLength(2);
    expect(
      result.documents.every(
        (document) =>
          new TextEncoder().encode(document).byteLength <= sitemapMaxBytes,
      ),
    ).toBe(true);
    expect(
      result.documents.reduce(
        (total, xml) => total + (xml.match(/<url>/g)?.length ?? 0),
        0,
      ),
    ).toBe(28_009);
  });
  it("escapes XML metacharacters", () => {
    const xml = `<loc>${escapeSitemapXml('https://k-pool.app/a?a=1&b=<"value">\'')}</loc>`;
    const parsed = new DOMParser().parseFromString(xml, "text/xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    expect(parsed.documentElement.textContent).toBe(
      'https://k-pool.app/a?a=1&b=<"value">\'',
    );
  });
  it("rejects URLs longer than the sitemap protocol limit rather than silently dropping them", () => {
    expect(
      buildSitemapDocuments([
        {
          slug: `gr-${"a".repeat(2100)}`,
          language: "ja",
          resourceType: "group",
          lastModifiedAt: null,
        },
      ]),
    ).toEqual({ status: "error" });
  });
  it("lists only canonical published translations and fixed pages, deduplicating with the latest publication date", () => {
    vi.stubEnv("KPOOL_PUBLIC_SITE_URL", "https://k-pool.app");
    const wiki = {
      slug: "gr-A&B<한국>",
      language: "ja",
      resourceType: "group" as const,
      lastModifiedAt: null,
    };
    const result = buildSitemapDocuments([
      wiki,
      { ...wiki, lastModifiedAt: "2026-10-01T00:00:00Z" },
      { ...wiki, lastModifiedAt: "2026-09-01T00:00:00Z" },
      { ...wiki, language: "ko" },
    ]);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.documents).toHaveLength(1);
    const xml = new DOMParser().parseFromString(
      result.documents[0],
      "text/xml",
    );
    expect(xml.querySelector("parsererror")).toBeNull();
    const urls = [...xml.querySelectorAll("url")];
    expect(urls).toHaveLength(11);
    for (const language of ["ja", "en", "ko"]) {
      for (const path of ["", "/terms", "/privacy"]) {
        expect(
          urls.some(
            (url) =>
              url.querySelector("loc")?.textContent ===
              `https://k-pool.app/${language}${path}`,
          ),
        ).toBe(true);
      }
    }
    const wikis = urls.filter((url) =>
      url.querySelector("loc")?.textContent?.includes("/wiki/"),
    );
    expect(wikis).toHaveLength(2);
    expect(wikis[0].querySelector("loc")?.textContent).toBe(
      "https://k-pool.app/ja/wiki/gr-A%26B%3C%ED%95%9C%EA%B5%AD%3E",
    );
    expect(wikis[0].querySelector("lastmod")?.textContent).toBe(
      "2026-10-01T00:00:00Z",
    );
    expect(wikis[1].querySelector("lastmod")).toBeNull();
    expect(result.documents[0]).not.toContain("/en/wiki/");
    expect(
      urls.every(
        (url) =>
          new URL(url.querySelector("loc")!.textContent!).origin ===
          getPublicSiteOrigin(),
      ),
    ).toBe(true);
  });
});
