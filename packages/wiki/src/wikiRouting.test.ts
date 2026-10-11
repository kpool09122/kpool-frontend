import { describe, expect, it } from "vitest";

import { wikiResourceTypeSchema, wikiResourceTypes } from "./types/wiki";
import {
  buildWikiEditPath,
  buildWikiEditEntryPath,
  buildWikiDraftEditPath,
  isWikiEditPath,
  buildWikiPath,
  getWikiResourceLabel,
  getWikiResourceTypeFromSlug,
  hasSupportedWikiPrefix,
  isWikiSlugCompatibleWithResourceType,
  normalizeWikiSlugForResourceType,
  stripWikiResourcePrefix,
} from "./wikiRouting";

describe("wikiRouting", () => {
  it("keeps an edit intent on the original content language detail through login", () => {
    expect(buildWikiEditEntryPath("ko", "gr-twice", "#fff")).toBe("/ko/wiki/gr-twice?edit=1&themeColor=%23fff");
  });
  it("builds draft ID edit URLs with a persistent resource type and optional theme", () => {
    expect(buildWikiDraftEditPath("draft/id", "group", "#fff")).toBe(
      "/wiki/draft%2Fid/edit?resourceType=group&themeColor=%23fff",
    );
    expect(buildWikiDraftEditPath("draft-1", "talent")).toBe("/wiki/draft-1/edit?resourceType=talent");
  });

  it.each(["/wiki/draft-1/edit", "/wiki/ko/gr-twice/edit", "/ko/wiki/gr-twice/edit"])(
    "recognizes the edit route %s independently of the UI locale", (path) => expect(isWikiEditPath(path)).toBe(true),
  );

  it("builds language-aware wiki paths", () => {
    expect(buildWikiPath("ja", "gr-aurora-echo")).toBe("/ja/wiki/gr-aurora-echo");
    expect(buildWikiEditPath("ko", "tl-nayeon-twice")).toBe(
      "/ko/wiki/tl-nayeon-twice/edit",
    );
  });

  it("detects resource types from slug prefixes", () => {
    expect(getWikiResourceTypeFromSlug("ag-jyp")).toBe("agency");
    expect(getWikiResourceTypeFromSlug("gr-twice")).toBe("group");
    expect(getWikiResourceTypeFromSlug("sg-cheer-up")).toBe("song");
    expect(getWikiResourceTypeFromSlug("tl-nayeon")).toBe("talent");
    expect(getWikiResourceTypeFromSlug("aurora-echo")).toBeNull();
  });

  it("normalizes slugs to the selected resource type prefix", () => {
    expect(normalizeWikiSlugForResourceType("aurora-echo", "group")).toBe(
      "gr-aurora-echo",
    );
    expect(normalizeWikiSlugForResourceType("tl-nayeon", "song")).toBe("sg-nayeon");
    expect(stripWikiResourcePrefix("ag-jyp")).toBe("jyp");
  });

  it("checks prefix compatibility", () => {
    expect(hasSupportedWikiPrefix("gr-aurora-echo")).toBe(true);
    expect(hasSupportedWikiPrefix("aurora-echo")).toBe(false);
    expect(isWikiSlugCompatibleWithResourceType("tl-nayeon", "talent")).toBe(true);
    expect(isWikiSlugCompatibleWithResourceType("tl-nayeon", "group")).toBe(false);
  });

  it("returns a user-facing label for resource types", () => {
    expect(getWikiResourceLabel("agency")).toBe("Agency");
    expect(getWikiResourceLabel("group")).toBe("Group");
    expect(getWikiResourceLabel("song")).toBe("Song");
    expect(getWikiResourceLabel("talent")).toBe("Talent");
  });

  it("uses the shared resource type contract for routing decisions", () => {
    expect(
      wikiResourceTypes.map((resourceType) => wikiResourceTypeSchema.safeParse(resourceType).success),
    ).toEqual([true, true, true, true]);
  });
});
