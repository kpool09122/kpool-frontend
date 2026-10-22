import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
const context = { params: Promise.resolve({ language: "ko", slug: "a/b" }) };
const request = (query = "resourceType=song") =>
  new NextRequest(`http://localhost/api/wiki/ko/a/videos?${query}`, {
    headers: { cookie: "secret=private", authorization: "Bearer secret" },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("public video BFF", () => {
  it("fetches exact identity anonymously and validates the response", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ videos: [] }));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ videos: [] });
    expect(fetcher).toHaveBeenCalledWith(
      "https://backend.example/api/v1/wiki/wiki/ko/song/a%2Fb/videos",
      expect.objectContaining({
        headers: { Accept: "application/json" },
        credentials: "omit",
        cache: "no-store",
      }),
    );
  });
  it.each(["", "resourceType=other"])(
    "rejects invalid identity before fetching",
    async (query) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      expect((await GET(request(query), context)).status).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([404, 500])("masks upstream error details (%s)", async (status) => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: "secret", trace: "internal" }, { status }),
        ),
    );
    const response = await GET(request(), context);
    expect(response.status).toBe(status === 404 ? 404 : 502);
    expect(await response.text()).not.toMatch(/secret|internal/);
  });
  it("does not fetch when backend is unconfigured", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await GET(request(), context)).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects unsupported languages before fetching", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await GET(request(), {
          params: Promise.resolve({ language: "xx", slug: "test" }),
        })
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("masks network failures", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("internal hostname")),
    );
    const response = await GET(request(), context);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("internal hostname");
  });
  it("handles malformed success payloads", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ videos: [{}] })),
    );
    expect((await GET(request(), context)).status).toBe(502);
  });
});
