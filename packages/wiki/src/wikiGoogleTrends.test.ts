import { describe, expect, it } from "vitest";
import {
  addWikiBlock,
  deleteWikiContent,
  reorderWikiContent,
  createWikiBlock,
  toWikiSectionContentPayload,
  parseWikiSectionsFromCode,
  serializeWikiSectionsToCode,
  preserveWikiContentKeys,
} from "./wikiEditModel";
import {
  adaptDraftWikiApiResponse,
  adaptWikiApiResponse,
} from "./wikiApiModel";
import { wikiGoogleTrendsSettingsSchema } from "./types/wiki";
import { buildGoogleTrendsEmbedUrl, buildGoogleTrendsExploreUrl, googleTrendsTimeRangeOptions } from "./wikiGoogleTrends";
import { wikiPrivateApiTypes } from "@kpool/types";
import { createMockWikiDetail } from "./mockWikiDetail";

describe("Google Trends block", () => {
  it.each([
    { searchTerm: "  ", region: "JP", timeRange: "today 12-m" },
    { searchTerm: "a".repeat(101), region: "JP", timeRange: "today 12-m" },
    { searchTerm: "TWICE", region: "", timeRange: "today 12-m" },
    { searchTerm: "TWICE", region: "US", timeRange: "today 12-m" },
    { searchTerm: "TWICE", region: "JP", timeRange: "all" },
  ])("rejects invalid settings through schema and code: %j", (settings) => {
    expect(wikiGoogleTrendsSettingsSchema.safeParse(settings).success).toBe(
      false,
    );
    expect(
      parseWikiSectionsFromCode(
        `== Trends ==\n\n[[google_trends|searchTerm:${encodeURIComponent(settings.searchTerm)}|region:${settings.region}|timeRange:${settings.timeRange}]]`,
      ),
    ).toEqual({ ok: false, code: "invalidMacro" });
  });

  it("adds, reorders and deletes Trends blocks through the shared content model", () => {
    const section = {
      type: "section" as const,
      sectionKey: "section",
      title: "Trends",
      depth: 1,
      displayOrder: 10,
      contents: [],
    };
    const [first, editingId] = addWikiBlock([section], "section", "google_trends", {
      name: "TWICE",
      language: "ko",
    });
    expect(editingId).toBeNull();
    const [second] = addWikiBlock(first, "section", "google_trends", {
      name: "BTS",
      language: "ko",
    });
    const [a, b] = second[0].contents;
    if (!("blockKey" in a) || !("blockKey" in b))
      throw new Error("Expected blocks");
    const reordered = reorderWikiContent(second, {
      parentSectionIdentifier: "section",
      source: `block:${b.blockKey}`,
      target: `block:${a.blockKey}`,
    });
    expect(
      reordered[0].contents.map((node) => "blockKey" in node && node.blockKey),
    ).toEqual([b.blockKey, a.blockKey]);
    expect(deleteWikiContent(reordered, b.blockKey)[0].contents).toEqual([
      expect.objectContaining({
        blockKey: a.blockKey,
        searchTerm: "TWICE",
        region: "KR",
      }),
    ]);
  });

  it.each(googleTrendsTimeRangeOptions)("accepts $value through the API input contract", ({ value }) => {
    expect(
      wikiPrivateApiTypes.schemas.WikiContentInput.safeParse({
        type: "google_trends",
        searchTerm: "TWICE",
        region: "all",
        timeRange: value,
      }).success,
    ).toBe(true);
  });

  it("uses the displayed Wiki name and language when adding a block", () => {
    for (const [language, region] of [
      ["ja", "JP"],
      ["ko", "KR"],
      ["en", "all"],
    ]) {
      expect(
        createWikiBlock("google_trends", 20, { name: "TWICE", language }),
      ).toMatchObject({
        blockType: "google_trends",
        searchTerm: "TWICE",
        region,
        timeRange: "today 12-m",
        displayOrder: 20,
      });
    }
  });
  it.each(googleTrendsTimeRangeOptions)("round trips $value through settings, API payload and code", ({ value }) => {
    const block = {
      blockType: "google_trends" as const,
      blockKey: "trends-key",
      displayOrder: 10,
      searchTerm: "TWICE | 트와이스 \\ % & ]]",
      region: "all" as const,
      timeRange: value,
    };
    const wiki = createMockWikiDetail("gr-twice");
    const sections = [
      {
        type: "section" as const,
        sectionKey: "trends-section",
        title: "Trends",
        displayOrder: 10,
        depth: 1,
        contents: [block],
      },
    ];
    for (const adapt of [adaptDraftWikiApiResponse, adaptWikiApiResponse]) {
      expect(
        adapt({
          ...wiki,
          sections: [
            { ...sections[0], contents: [{ type: "google_trends", ...block }] },
          ],
        }).sections,
      ).toEqual(sections);
    }
    const code = serializeWikiSectionsToCode(sections);
    const parsed = parseWikiSectionsFromCode(code);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const restored = preserveWikiContentKeys(parsed.sections, sections);
    expect(restored).toEqual(sections);
    expect(toWikiSectionContentPayload(restored)).toEqual([
      {
        ...sections[0],
        depth: undefined,
        contents: [
          {
            type: "google_trends",
            blockKey: block.blockKey,
            displayOrder: 10,
            searchTerm: block.searchTerm,
            region: "all",
            timeRange: value,
          },
        ],
      },
    ]);
  });

  it.each([
    ["today 3-m", "today 3-m"],
    ["today 6-m", "2026-05-23 2026-11-23"],
    ["today 12-m", "today 12-m"],
    ["today 2-y", "2024-11-23 2026-11-23"],
    ["today 5-y", "today 5-y"],
    ["today 10-y", "2016-11-23 2026-11-23"],
  ] as const)("uses matching date bounds for the widget and external link: %s", (timeRange, date) => {
    const settings = { searchTerm: "TWICE", region: "JP" as const, timeRange };
    const now = new Date("2026-11-23T10:00:00Z");
    const link = new URL(buildGoogleTrendsExploreUrl(settings, "ja", now));
    const widget = new URL(buildGoogleTrendsEmbedUrl(settings, "ja", now));
    expect(link.searchParams.get("date")).toBe(date);
    expect(JSON.parse(widget.searchParams.get("req")!).comparisonItem[0].time).toBe(date);
    expect(new URLSearchParams(widget.searchParams.get("eq")!).get("date")).toBe(date);
  });

  it.each([
    ["today 6-m", "2025-08-31T23:00:00Z", "2025-02-28 2025-08-31"],
    ["today 2-y", "2024-02-29T00:00:00Z", "2022-02-28 2024-02-29"],
    ["today 10-y", "2024-02-29T00:00:00Z", "2014-02-28 2024-02-29"],
  ] as const)("clamps month ends and leap days for %s", (timeRange, now, date) => {
    const link = new URL(buildGoogleTrendsExploreUrl({ searchTerm: "TWICE", region: "all", timeRange }, "en", new Date(now)));
    expect(link.searchParams.get("date")).toBe(date);
  });
});
