import { describe, expect, it } from "vitest";

import {
  applyInlineMarkdownFormat,
  parseInlineMarkdown,
} from "./editing";

describe("applyInlineMarkdownFormat", () => {
  it("wraps the selected text in bold markers", () => {
    expect(
      applyInlineMarkdownFormat({
        content: "Aurora Echo",
        format: "bold",
        selectionEnd: 12,
        selectionStart: 7,
      }),
    ).toEqual({
      content: "Aurora **Echo**",
      selectionEnd: 15,
      selectionStart: 15,
    });
  });

  it("inserts a markdown link with the provided url", () => {
    expect(
      applyInlineMarkdownFormat({
        content: "Aurora Echo",
        format: "link",
        selectionEnd: 6,
        selectionStart: 0,
        url: "https://example.com",
      }),
    ).toEqual({
      content: "[Aurora](https://example.com) Echo",
      selectionEnd: 29,
      selectionStart: 29,
    });
  });

  it("inserts placeholder text when adding a link without a selection", () => {
    expect(
      applyInlineMarkdownFormat({
        content: "",
        format: "link",
        selectionEnd: 0,
        selectionStart: 0,
        url: "https://example.com",
      }),
    ).toEqual({
      content: "[link](https://example.com)",
      selectionEnd: 27,
      selectionStart: 27,
    });
  });

  it("allows wrapping existing markdown with another format", () => {
    expect(
      applyInlineMarkdownFormat({
        content: "**Echo**",
        format: "italic",
        selectionEnd: 8,
        selectionStart: 0,
      }),
    ).toEqual({
      content: "_**Echo**_",
      selectionEnd: 10,
      selectionStart: 10,
    });
  });
});

describe("parseInlineMarkdown", () => {
  it("parses the supported inline markdown tokens", () => {
    expect(
      parseInlineMarkdown("**bold** _italic_ ~~strike~~ [site](https://example.com)"),
    ).toEqual([
      { children: [{ kind: "text", text: "bold" }], kind: "strong" },
      { kind: "text", text: " " },
      { children: [{ kind: "text", text: "italic" }], kind: "emphasis" },
      { kind: "text", text: " " },
      { children: [{ kind: "text", text: "strike" }], kind: "strikethrough" },
      { kind: "text", text: " " },
      {
        children: [{ kind: "text", text: "site" }],
        href: "https://example.com",
        kind: "link",
      },
    ]);
  });

  it("parses nested inline markdown tokens", () => {
    expect(parseInlineMarkdown("**_bold italic_**")).toEqual([
      {
        children: [
          {
            children: [{ kind: "text", text: "bold italic" }],
            kind: "emphasis",
          },
        ],
        kind: "strong",
      },
    ]);
  });

  it("keeps invalid markdown as plain text", () => {
    expect(parseInlineMarkdown("Broken [link](not a url")).toEqual([
      { kind: "text", text: "Broken [link](not a url" },
    ]);
  });
});
