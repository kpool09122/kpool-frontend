import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWikiVideos } from "./wikiVideos";

afterEach(() => vi.unstubAllGlobals());
describe("public wiki videos", () => {
  it("uses exact encoded identity without credentials and preserves order/nullable fields", async () => {
    const videos = [2, 1].map((n) => ({
      videoLinkIdentifier: `00000000-0000-4000-8000-00000000000${n}`,
      url: "https://youtu.be/abcdefghijk",
      title: `Video ${n}`,
      thumbnailUrl: null,
      publishedAt: null,
      durationSeconds: 253,
      videoUsage: n === 2 ? "music_video" : "youtube_auto_view_count",
    }));
    const fetcher = vi.fn().mockResolvedValue(Response.json({ videos }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await fetchWikiVideos({
        language: "ko",
        resourceType: "song",
        slug: "a/b?",
      }),
    ).toEqual({ videos });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/wiki/ko/a%2Fb%3F/videos?resourceType=song",
      { credentials: "omit" },
    );
  });
  it("accepts empty lists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ videos: [] })),
    );
    expect(
      await fetchWikiVideos({
        language: "ja",
        resourceType: "agency",
        slug: "agency",
      }),
    ).toEqual({ videos: [] });
  });
  it.each([
    Response.json({ message: "secret" }, { status: 500 }),
    Response.json({ videos: [{}] }),
    new Response("bad json"),
  ])(
    "rejects failed or invalid responses with a safe message",
    async (response) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(
        fetchWikiVideos({
          language: "en",
          resourceType: "group",
          slug: "test",
        }),
      ).rejects.toThrow("Videos are temporarily unavailable.");
    },
  );
});
