import { describe, expect, it } from "vitest";
import { formatVideoDuration, getYouTubeVideoId, getYouTubeThumbnailUrl } from "./wikiVideoModel";

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
