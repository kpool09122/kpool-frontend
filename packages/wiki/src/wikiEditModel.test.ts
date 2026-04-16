import { describe, expect, it } from "vitest";

import {
  addWikiBlock,
  addWikiSection,
  deleteWikiContent,
  getWikiContentEditorId,
  toWikiSectionContentPayload,
  updateWikiBlock,
  updateWikiSection,
} from "./wikiEditModel";
import { createMockWikiDetail } from "./mockWikiDetail";
import type { WikiBlock, WikiSection } from "./types/wiki";

const createSection = (overrides?: Partial<WikiSection>): WikiSection => ({
  sectionIdentifier: "sec-root",
  title: "Root",
  displayOrder: 10,
  depth: 1,
  contents: [
    {
      blockIdentifier: "block-root-text",
      blockType: "text",
      displayOrder: 10,
      content: "Root text",
    },
  ],
  children: [],
  ...overrides,
});

describe("wikiEditModel", () => {
  it("adds nested sections until backend max depth and opens the new section editor", () => {
    const [updated, editId] = addWikiSection([createSection()], "sec-root");

    expect(updated[0]?.contents).toContainEqual(
      expect.objectContaining({
        type: "section",
        depth: 2,
        title: "New section",
      }),
    );
    expect(editId).toMatch(/^section:/);
  });

  it("does not add a child section under depth 3", () => {
    const depthThree = createSection({
      depth: 3,
      contents: [],
    });

    const [updated, editId] = addWikiSection([depthThree], "sec-root");

    expect(updated[0]?.contents).toEqual([]);
    expect(editId).toBeNull();
  });

  it("adds a block and opens the block editor", () => {
    const [updated, editId] = addWikiBlock([createSection()], "sec-root", "quote");

    expect(updated[0]?.contents).toContainEqual(
      expect.objectContaining({
        blockType: "quote",
        content: "New quote",
      }),
    );
    expect(editId).toMatch(/^block:/);
  });

  it("updates and deletes section content without mutating sibling items", () => {
    const section = createSection();
    const textBlock = section.contents[0] as WikiBlock;
    const updatedBlock = updateWikiBlock([section], textBlock.blockIdentifier, {
      content: "Updated text",
    });
    const updatedSection = updateWikiSection(updatedBlock, "sec-root", {
      title: "Updated Root",
    });
    const deleted = deleteWikiContent(updatedSection, textBlock.blockIdentifier);

    expect((updatedBlock[0]?.contents[0] as WikiBlock).content).toBe("Updated text");
    expect(updatedSection[0]?.title).toBe("Updated Root");
    expect(deleted[0]?.contents).toEqual([]);
  });

  it("converts editable contents into the backend SectionContentMapper array shape", () => {
    const wiki = createMockWikiDetail("aurora-echo");
    const payload = toWikiSectionContentPayload(wiki.sections);

    expect(payload[0]).toMatchObject({
      type: "section",
      title: "Overview",
      display_order: 10,
      contents: [
        {
          block_type: "text",
          display_order: 10,
          content:
            "Aurora Echo debuted with a performance style built around fluid formations, layered harmonies, and warm retro production.",
        },
        {
          type: "section",
          title: "Style",
        },
      ],
    });
    expect(payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "section",
          title: "Members",
        }),
      ]),
    );
  });

  it("creates stable editor ids for sections and blocks", () => {
    const section = createSection();
    const block = section.contents[0] as WikiBlock;

    expect(getWikiContentEditorId(section)).toBe("section:sec-root");
    expect(getWikiContentEditorId(block)).toBe("block:block-root-text");
  });
});
