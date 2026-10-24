import { describe, expect, it } from "vitest";
import { normalizeYouTubeVideoUrl } from "./wikiVideoModel";

describe("normalizeYouTubeVideoUrl", () => {
  it("uses the watch video, never playlist/index, for a single canonical URL", () => {
    expect(
      normalizeYouTubeVideoUrl(
        "https://www.youtube.com/watch?v=Os_heh8vPfs&list=RDokVTSehE414&index=27",
      ),
    ).toBe("https://www.youtube.com/watch?v=Os_heh8vPfs");
    expect(normalizeYouTubeVideoUrl("https://youtu.be/Os_heh8vPfs?t=2")).toBe(
      "https://www.youtube.com/watch?v=Os_heh8vPfs",
    );
    expect(normalizeYouTubeVideoUrl("javascript:alert(1)")).toBeNull();
  });
});
