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
import { wikiPrivateApiTypes } from "@kpool/types";
import { createMockWikiDetail } from "./mockWikiDetail";

describe("Google Trends block", () => {
  it.each([
    { searchTerm: "  ", region: "JP", timeRange: "today 12-m" },
    { searchTerm: "a".repeat(101), region: "JP", timeRange: "today 12-m" },
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
    const [first] = addWikiBlock([section], "section", "google_trends", {
      name: "TWICE",
      language: "ko",
    });
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

  it("accepts the backend-generated input contract", () => {
    expect(
      wikiPrivateApiTypes.schemas.WikiContentInput.safeParse({
        type: "google_trends",
        searchTerm: "TWICE",
        region: "",
        timeRange: "today 5-y",
      }).success,
    ).toBe(true);
  });

  it("uses the displayed Wiki name and language when adding a block", () => {
    for (const [language, region] of [
      ["ja", "JP"],
      ["ko", "KR"],
      ["en", ""],
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
  it("round trips backend-generated settings, keys, API payload and code", () => {
    const block = {
      blockType: "google_trends" as const,
      blockKey: "trends-key",
      displayOrder: 10,
      searchTerm: "TWICE | 트와이스 \\ % & ]]",
      region: "KR" as const,
      timeRange: "today 5-y" as const,
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
            region: "KR",
            timeRange: "today 5-y",
          },
        ],
      },
    ]);
  });
});
