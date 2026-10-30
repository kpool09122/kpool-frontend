import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSitemapWikis } from "@/gateways/wiki/sitemapWikis";
import { GET } from "./route";
import { GET as getPart } from "../sitemaps/[file]/route";
import robots from "../robots";
vi.mock("@/gateways/wiki/sitemapWikis", () => ({ loadSitemapWikis: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("public sitemap routes", () => {
  it("serves XML without login, advertises a bounded cache and exposes robots discovery", async () => {
    vi.mocked(loadSitemapWikis).mockResolvedValue({
      status: "success",
      wikis: [],
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, must-revalidate",
    );
    expect((await response.text()).match(/<url>/g)).toHaveLength(9);
    expect(robots().sitemap).toBe("https://k-pool.app/sitemap.xml");
  });
  it("fails closed with no caching on upstream failure", async () => {
    vi.mocked(loadSitemapWikis).mockResolvedValue({ status: "error" });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("Sitemap temporarily unavailable.");
  });
  it("serves an index and complete child XML when the URL count exceeds the limit", async () => {
    vi.mocked(loadSitemapWikis).mockResolvedValue({
      status: "success",
      wikis: Array.from({ length: 50_000 }, (_, id) => ({
        slug: `tl-${id}`,
        language: "ko",
        resourceType: "talent",
        lastModifiedAt: null,
      })),
    });
    const root = await GET();
    const xml = new DOMParser().parseFromString(await root.text(), "text/xml");
    expect(xml.documentElement.localName).toBe("sitemapindex");
    expect(xml.querySelectorAll("sitemap")).toHaveLength(2);
    const part = await getPart(new Request("https://k-pool.app"), {
      params: Promise.resolve({ file: "1.xml" }),
    });
    expect(part.status).toBe(200);
    expect((await part.text()).match(/<url>/g)).toHaveLength(9);
  });
  it("does not reuse a cached enumeration after publication, updates or deletion", async () => {
    const wiki = {
      slug: "ag-new",
      language: "en",
      resourceType: "agency" as const,
      lastModifiedAt: "2026-10-01T00:00:00Z",
    };
    vi.mocked(loadSitemapWikis)
      .mockResolvedValueOnce({ status: "success", wikis: [] })
      .mockResolvedValueOnce({ status: "success", wikis: [wiki] })
      .mockResolvedValueOnce({
        status: "success",
        wikis: [{ ...wiki, lastModifiedAt: "2026-10-02T00:00:00Z" }],
      })
      .mockResolvedValueOnce({ status: "success", wikis: [] });
    expect(await (await GET()).text()).not.toContain("ag-new");
    expect(await (await GET()).text()).toContain("ag-new");
    expect(await (await GET()).text()).toContain("2026-10-02T00:00:00Z");
    expect(await (await GET()).text()).not.toContain("ag-new");
  });
  it("fails closed for invalid public-site configuration", async () => {
    vi.stubEnv(
      "KPOOL_PUBLIC_SITE_URL",
      "https://user:password@private.example",
    );
    vi.mocked(loadSitemapWikis).mockResolvedValue({
      status: "success",
      wikis: [],
    });
    expect((await GET()).status).toBe(503);
    expect(robots().sitemap).toBeUndefined();
  });
  it("returns 404 for invalid or absent parts", async () => {
    vi.mocked(loadSitemapWikis).mockResolvedValue({
      status: "success",
      wikis: [],
    });
    for (const file of ["-1.xml", "01.xml", "bad.xml", "99.xml"]) {
      expect(
        (
          await getPart(new Request("https://k-pool.app"), {
            params: Promise.resolve({ file }),
          })
        ).status,
      ).toBe(404);
    }
  });
});
