import { describe, expect, it } from "vitest";
import { wikiPrivateApiTypes } from "@kpool/types";
import { adaptWikiApiResponse } from "./wikiApiModel";
import { toWikiSectionContentPayload } from "./wikiEditPayload";
import { parseWikiSectionsFromCode } from "./wikiCodeParser";
import { preserveWikiContentKeys } from "./wikiContentKeys";
import { createWikiBlock, isWikiSection, reorderWikiContent } from "./wikiSectionModel";
import type { WikiSection } from "./types/wiki";

const fromApi = (sections: unknown[]) => adaptWikiApiResponse({
  basic: { name: "Example", normalizedName: "example" },
  heroImage: { alt: "", src: "" }, language: "ja", resourceType: "group",
  sections, slug: "gr-example", translationSetIdentifier: "set", wikiIdentifier: "wiki", version: 1,
});
const section = (key: string, title: string, body: string, order: number): WikiSection => ({
  type: "section", sectionKey: key, title, displayOrder: order, depth: 1,
  contents: [{ blockType: "text", blockKey: `${key}-body`, content: body, displayOrder: 10 }],
});

describe("persistent wiki content keys", () => {
  it("saves legacy content with keys while preserving titles, bodies and hierarchy", () => {
    const wiki = fromApi([{ type: "section", title: "Overview", display_order: 10, contents: [
      { block_type: "text", content: "Original", display_order: 10 },
      { type: "section", title: "Child", display_order: 20, contents: [] },
    ] }]);
    expect(toWikiSectionContentPayload(wiki.sections)).toEqual([{
      type: "section", sectionKey: "section-1", title: "Overview", displayOrder: 10, contents: [
        { type: "text", blockKey: "section-1-block-1", content: "Original", displayOrder: 10 },
        { type: "section", sectionKey: "section-1-2", title: "Child", displayOrder: 20, contents: [] },
      ],
    }]);
  });

  it("keeps persisted keys after reordering, saving, schema validation and reloading", () => {
    const wiki = fromApi([
      { type: "section", section_key: "overview", title: "Overview", display_order: 10, contents: [
        { block_type: "text", block_key: "body", content: "Original", display_order: 10 },
      ] },
      { type: "section", section_key: "sources", title: "Sources", display_order: 20, contents: [] },
    ]);
    const reordered = reorderWikiContent(wiki.sections, { source: "section:overview", target: "section:sources" });
    const payload = toWikiSectionContentPayload(reordered);
    const parsed = wikiPrivateApiTypes.schemas.UpdateWikiDraftRequestBody.safeParse({
      sections: payload, basic: {}, resourceType: "group",
    });
    if (!parsed.success) throw new Error("Expected valid keyed payload");
    expect(parsed.data.sections).toEqual(payload);
    const reloaded = fromApi(payload);
    expect(reloaded.sections.map((node) => node.sectionKey)).toEqual(["sources", "overview"]);
    expect(reloaded.sections[1].contents[0]).toMatchObject({ blockKey: "body", content: "Original" });
  });

  it("does not equate independently saved legacy translations by their positions", () => {
    const legacy = fromApi([{ type: "section", title: "Overview", display_order: 10, contents: [
      { block_type: "text", content: "Original", display_order: 10 },
    ] }]);
    const [source] = toWikiSectionContentPayload(legacy.sections, "source-wiki");
    const [translation] = toWikiSectionContentPayload(legacy.sections, "translated-wiki");
    expect(source).toMatchObject({ sectionKey: "source-wiki:section-1", contents: [
      { blockKey: "source-wiki:section-1-block-1" },
    ] });
    expect(translation).toMatchObject({ sectionKey: "translated-wiki:section-1" });
    const reloaded = fromApi([source]);
    expect(toWikiSectionContentPayload(reloaded.sections, "translated-wiki")).toEqual([source]);
  });

  it("sends keys for all block types", () => {
    const blocks = ["text", "image", "image_gallery", "embed", "quote", "list", "history", "google_trends", "table", "profile_card_list"] as const;
    const node: WikiSection = { type: "section", sectionKey: "all", title: "All", displayOrder: 10, depth: 1,
      contents: blocks.map((type, index) => createWikiBlock(type, index * 10)),
    };
    const [payload] = toWikiSectionContentPayload([node]);
    expect(payload).toMatchObject({ sectionKey: "all", contents: node.contents.map((block) => ({
      blockKey: !isWikiSection(block) ? block.blockKey : "",
    })) });
    expect(new Set(node.contents.map((block) => !isWikiSection(block) && block.blockKey)).size).toBe(blocks.length);
  });

  it("keeps keys for identical duplicate blocks when another section is edited", () => {
    const overview = section("overview", "Overview", "Same body", 10);
    overview.contents.push({ blockType: "text", blockKey: "second-body", content: "Same body", displayOrder: 20 });
    const previous = [overview, section("sources", "Sources", "Old source", 20)];
    const parsed = parseWikiSectionsFromCode("== Overview ==\n\nSame body\n\nSame body\n\n== Sources ==\n\nNew source");
    if (!parsed.ok) throw new Error("Expected valid code");
    const result = preserveWikiContentKeys(parsed.sections, previous);
    expect(result[0].contents.map((node) => !isWikiSection(node) && node.blockKey)).toEqual(["overview-body", "second-body"]);
  });

  it("keeps keys through code edits and reordering while issuing keys for additions", () => {
    const previous = [section("overview", "Overview", "Original", 10), section("sources", "Sources", "Old source", 20)];
    const parsed = parseWikiSectionsFromCode("== Sources ==\n\nNew source\n\n== Overview ==\n\nOriginal\n\n== Added ==\n\nNew body");
    if (!parsed.ok) throw new Error("Expected valid code");
    const result = preserveWikiContentKeys(parsed.sections, previous);
    expect(result.map((node) => node.sectionKey).slice(0, 2)).toEqual(["sources", "overview"]);
    expect(result[0].contents[0]).toMatchObject({ blockKey: "sources-body", content: "New source" });
    expect(result[1].contents[0]).toMatchObject({ blockKey: "overview-body", content: "Original" });
    expect(previous.map((node) => node.sectionKey)).not.toContain(result[2].sectionKey);
  });
});
