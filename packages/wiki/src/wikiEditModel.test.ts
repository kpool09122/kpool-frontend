import { describe, expect, it } from "vitest";

import {
  addWikiBlock,
  addWikiSection,
  createWikiBlock,
  deleteWikiContent,
  getWikiContentEditorId,
  parseWikiSectionsFromCode,
  serializeWikiSectionsToCode,
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

  it("creates new text blocks with empty content", () => {
    expect(createWikiBlock("text", 10)).toMatchObject({
      blockType: "text",
      content: "",
      displayOrder: 10,
    });
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

  it("round-trips structured sections through code mode into a stable canonical code form", () => {
    const wiki = createMockWikiDetail("aurora-echo");
    const code = serializeWikiSectionsToCode(wiki.sections);
    const parsed = parseWikiSectionsFromCode(code);

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    expect(serializeWikiSectionsToCode(parsed.sections)).toBe(code);
    expect(code).toContain("[[image|id:img-discography-stage|src:");
    expect(code).toContain("== Highlights ==");
  });

  it("parses namu-like headings, lists, tables, and unknown macros as editable content", () => {
    const parsed = parseWikiSectionsFromCode([
      "= Overview =",
      "",
      "Aurora Echo keeps a fast release cycle.",
      "",
      "[[분류:테스트]]",
      "",
      "* Debut single",
      "* Follow-up single",
      "",
      "== Highlights ==",
      "",
      "|| !Release || !Year ||",
      "|| Low Tide, High Lights || 2022 ||",
    ].join("\n"));

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    expect(toWikiSectionContentPayload(parsed.sections)).toEqual([
      {
        type: "section",
        title: "Overview",
        display_order: 10,
        contents: [
          {
            block_type: "text",
            display_order: 10,
            content: "Aurora Echo keeps a fast release cycle.",
          },
          {
            block_type: "text",
            display_order: 20,
            content: "[[분류:테스트]]",
          },
          {
            block_type: "list",
            display_order: 30,
            list_type: "bullet",
            items: ["Debut single", "Follow-up single"],
          },
          {
            type: "section",
            title: "Highlights",
            display_order: 40,
            contents: [
              {
                block_type: "table",
                display_order: 10,
                headers: ["Release", "Year"],
                rows: [["Low Tide, High Lights", "2022"]],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("returns a parse error when headings skip levels or exceed the supported depth", () => {
    expect(
      parseWikiSectionsFromCode(["= Overview =", "", "=== Broken ==="].join("\n")),
    ).toEqual({
      ok: false,
      message: "Heading depth cannot skip levels. Add the missing parent section first.",
    });

    expect(
      parseWikiSectionsFromCode([
        "= Overview =",
        "",
        "== Style ==",
        "",
        "==== Too Deep ====",
      ].join("\n")),
    ).toEqual({
      ok: false,
      message: "Code mode supports headings up to depth 3.",
    });
  });

  it("returns a parse error for malformed structured macros", () => {
    expect(
      parseWikiSectionsFromCode([
        "= Overview =",
        "",
        "[[image|id:cover|src:https://example.com/image.png",
      ].join("\n")),
    ).toEqual({
      ok: false,
      message:
        "Code mode could not parse a structured block. Fix the macro syntax or clear the draft.",
    });
  });
});
