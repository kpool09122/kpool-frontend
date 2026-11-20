import { afterEach, expect, it, vi } from "vitest";
import { loadPopularVideos } from "./popularVideos";

const video = {
  videoLinkIdentifier: "01965bb2-bcc9-7c6f-8b90-89f7f217f101",
  provider: "youtube", externalVideoId: "abcdefghijk",
  url: "https://www.youtube.com/watch?v=abcdefghijk", title: "Aurora live",
  thumbnailUrl: null, durationSeconds: 120, likeCount: 42, language: "ja", slug: "gr-aurora",
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("loads the global ranking on the server with a short shared cache", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example/api/v1/wiki");
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ videos: [video] }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await loadPopularVideos()).toEqual({ status: "success", videos: [video] });
  expect(fetchMock).toHaveBeenCalledWith("https://backend.example/api/v1/wiki/videos/popular", expect.objectContaining({
    next: { revalidate: 60, tags: ["wiki-public-content"] },
  }));
});
it("accepts videos with no likes", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  const unliked = { ...video, likeCount: 0 };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ videos: [unliked] })));
  expect(await loadPopularVideos()).toEqual({ status: "success", videos: [unliked] });
});
it("retains a successful empty result", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ videos: [] })));
  expect(await loadPopularVideos()).toEqual({ status: "success", videos: [] });
});
it.each([
  { videos: [{ ...video, likeCount: -1 }] },
  { videos: [{ ...video, externalVideoId: "invalid" }] },
  { videos: Array(11).fill(video) },
  {},
])("rejects malformed rankings without showing partial results", async (body) => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  expect(await loadPopularVideos()).toEqual({ status: "error" });
});
it("returns an unavailable state for API and network failures", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  expect(await loadPopularVideos()).toEqual({ status: "error" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  expect(await loadPopularVideos()).toEqual({ status: "error" });
});
