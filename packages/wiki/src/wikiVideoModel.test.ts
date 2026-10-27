import { describe, expect, it } from "vitest";
import { formatVideoDuration, getYouTubeVideoId, getYouTubeThumbnailUrl, getTikTokVideoId, normalizeVideoUrl, getVideoThumbnailUrl } from "./wikiVideoModel";

describe("provider-specific identifiers and saved images", () => {
  it("keeps TikTok IDs as strings and validates hosts and path", () => {
    expect(getTikTokVideoId("6718335390845095173")).toBe("6718335390845095173");
    expect(getTikTokVideoId("https://www.tiktok.com/@scout2015/video/6718335390845095173")).toBe("6718335390845095173");
    for (const value of ["https://www.tiktok.com.evil.test/@x/video/6718335390845095173", "https://user:pass@www.tiktok.com/@x/video/6718335390845095173", "https://vm.tiktok.com/a/b", "https://www.tiktok.com/@x/photo/6718335390845095173", "https://www.tiktok.com/@x/video/0718335390845095173"]) expect(normalizeVideoUrl(value)).toBeNull();
  });
  it("accepts only trusted saved image hosts, including WebP", () => {
    expect(getVideoThumbnailUrl("https://images.k-pool.app/images/video.webp")).toBe("https://images.k-pool.app/images/video.webp");
    for (const value of ["data:image/webp;base64,AAAA", "javascript:alert(1)", "https://images.k-pool.app.evil.test/images/video.webp", "https://images.k-pool.app/track", "https://tracking.example/video.webp", "http://user:secret@localhost:8080/image.webp"]) expect(getVideoThumbnailUrl(value)).toBeNull();
  });
});
describe("video duration", () => {
  it.each([
    [0, "0:00"],
    [9, "0:09"],
    [60, "1:00"],
    [253, "4:13"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3661, "1:01:01"],
    [36000, "10:00:00"],
    [null, null],
    [-1, null],
    [1.5, null],
    [NaN, null],
    [Infinity, null],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatVideoDuration(seconds)).toBe(expected);
  });
});
describe("YouTube URLs", () => {
  it.each([
    "abcdefghijk",
    "https://youtu.be/abcdefghijk",
    "https://www.youtube.com/watch?v=abcdefghijk",
    "https://www.youtube.com/shorts/abcdefghijk",
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  ])("accepts supported URL/id %s", (value) =>
    expect(getYouTubeVideoId(value)).toBe("abcdefghijk"),
  );
  it.each([
    "javascript:alert(1)",
    "https://evil.example/watch?v=abcdefghijk",
    "https://youtube.com.evil.example/abcdefghijk",
    "https://youtube.com/playlist/abcdefghijk",
    "https://user:pass@youtube.com/watch?v=abcdefghijk",
    "https://youtu.be:444/abcdefghijk",
    "short-id",
    "http://youtu.be/abcdefghijk",
  ])("rejects unsafe/invalid %s", (value) =>
    expect(getYouTubeVideoId(value)).toBeNull(),
  );
  it("allows only saved YouTube image hosts over HTTPS", () => {
    expect(
      getYouTubeThumbnailUrl(
        "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
      ),
    ).toContain("i.ytimg.com");
    for (const value of [
      null,
      "data:image/png;base64,abc",
      "javascript:alert(1)",
      "https://tracking.example/x",
      "https://i.ytimg.com.evil.example/x",
    ])
      expect(getYouTubeThumbnailUrl(value)).toBeNull();
  });
});
