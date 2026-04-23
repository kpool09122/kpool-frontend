import { describe, expect, it } from "vitest";

import {
  buildWikiEditPath,
  buildWikiPath,
  getWikiResourceLabel,
  getWikiResourceTypeFromSlug,
  hasSupportedWikiPrefix,
  isWikiSlugCompatibleWithResourceType,
  normalizeWikiSlugForResourceType,
  stripWikiResourcePrefix,
} from "./wikiRouting";

describe("wikiRouting", () => {
  it("builds language-aware wiki paths", () => {
    expect(buildWikiPath("ja", "gr-aurora-echo")).toBe("/wiki/ja/gr-aurora-echo");
    expect(buildWikiEditPath("ko", "tl-nayeon-twice")).toBe(
      "/wiki/ko/tl-nayeon-twice/edit",
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
});
