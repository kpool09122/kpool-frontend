import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSitemapWikis } from "./sitemapWikis";

const wiki = {
  slug: "gr-example",
  language: "ja",
  resourceType: "group",
  lastModifiedAt: "2026-10-01T12:00:00+09:00",
};
const cursor = "00000000-0000-4000-8000-000000000001";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("sitemap wiki enumeration", () => {
  it("accepts zero published wikis", async () => {
    vi.stubEnv(
      "KPOOL_WIKI_PRIVATE_API_BASE_URL",
      "https://api.example.test/api/v1/wiki",
    );
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ wikis: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadSitemapWikis()).toEqual({ status: "success", wikis: [] });
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/wiki/sitemap/wikis?perPage=1000",
    );
  });
  it("fails closed when the API origin is missing", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await loadSitemapWikis()).toEqual({ status: "error" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 422, 429, 500, 503])(
    "does not return partial results after HTTP %s",
    async (status) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            Response.json({ wikis: [wiki], nextCursor: cursor }),
          )
          .mockResolvedValueOnce(
            Response.json(
              { message: "internal secret", trace: ["private"] },
              { status },
            ),
          ),
      );
      expect(await loadSitemapWikis()).toEqual({ status: "error" });
    },
  );
  it.each([
    { wikis: [wiki] },
    { wikis: [{ ...wiki, lastModifiedAt: "not-a-date" }], nextCursor: null },
    { wikis: [{ ...wiki, resourceType: "private" }], nextCursor: null },
    { wikis: [{ ...wiki, slug: "tl-wrong-resource" }], nextCursor: null },
    { wikis: [wiki], nextCursor: "bad" },
    { wikis: Array.from({ length: 1001 }, () => wiki), nextCursor: null },
  ])("rejects invalid contract responses", async (body) => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    expect(await loadSitemapWikis()).toEqual({ status: "error" });
  });
  it("rejects cyclic cursors instead of looping", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Response.json({ wikis: [wiki], nextCursor: cursor })),
        ),
    );
    expect(await loadSitemapWikis()).toEqual({ status: "error" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid JSON and network failures without leaking exceptions", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON")));
    expect(await loadSitemapWikis()).toEqual({ status: "error" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private origin")),
    );
    expect(await loadSitemapWikis()).toEqual({ status: "error" });
  });
  it("reads every cursor page without cookies or stale fetch caching", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ wikis: [wiki], nextCursor: cursor }),
      )
      .mockResolvedValueOnce(
        Response.json({
          wikis: [{ ...wiki, language: "ko" }],
          nextCursor: null,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
    expect(await loadSitemapWikis()).toEqual({
      status: "success",
      wikis: [wiki, { ...wiki, language: "ko" }],
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/wiki/sitemap/wikis?perPage=1000",
      expect.objectContaining({
        cache: "no-store",
        headers: { accept: "application/json" },
      }),
    );
    expect(fetcher.mock.calls[1][0]).toContain(`cursor=${cursor}`);
  });
});
