import { describe, expect, it } from "vitest";
import { getYouTubeVideoId, getYouTubeThumbnailUrl } from "./wikiVideoModel";
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
