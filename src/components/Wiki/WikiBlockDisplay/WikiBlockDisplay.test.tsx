import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WikiBlockDisplay } from "./index";

const longUrl =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHs3TB7sXKlDyoxSSyk2DSanTdj2tnV5_AB96T_61RoI7d4QX532769HJP43NSO31B_gXlGXwFY6Mz1vDM4D_v11M8R5KKBBro17S3QcKK3QsBnpDcGK48hItgtoSyRX5W7D2-EUw==";
const expectWrappedText = (element: Element | null) => {
  expect(element).not.toBeNull();
  expect(element).toHaveClass("min-w-0");
  expect(element).toHaveClass("break-words");
  expect(element?.className).toContain("[overflow-wrap:anywhere]");
  expect(element?.className).toContain("[word-break:break-word]");
};

describe("WikiBlockDisplay", () => {
  it("renders list blocks", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "list-1",
          blockType: "list",
          displayOrder: 10,
          listType: "bullet",
          items: ["First item", "Second item"],
        }}
      />,
    );

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });

  it("renders table blocks", () => {
    const { container } = render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "table-1",
          blockType: "table",
          displayOrder: 20,
          headers: ["Role", "Member"],
          headerCells: [{ content: "Role" }, { content: "Member" }],
          rows: [["Leader", "Mina"]],
          rowCells: [[{ content: "Leader" }, { content: "Mina" }]],
          tableWidth: 320,
        }}
      />,
    );

    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Leader")).toBeInTheDocument();
    expect(screen.getByText("Mina")).toBeInTheDocument();
    expect(container.querySelector("table")).toHaveStyle({ width: "320px" });
  });

  it("renders table cell colspan when present", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "table-2",
          blockType: "table",
          displayOrder: 20,
          headers: ["Release", "Year"],
          headerCells: [{ content: "Release" }, { content: "Year" }],
          rows: [["Aurora Echo"]],
          rowCells: [[{ content: "Aurora Echo", colspan: 2 }]],
          tableWidth: 320,
        }}
      />,
    );

    expect(screen.getByText("Aurora Echo", { selector: "td" })).toHaveAttribute("colspan", "2");
  });

  it("renders image captions when present", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "image-1",
          blockType: "image",
          displayOrder: 30,
          imageIdentifier: "image-1",
          imageSrc:
            "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='%23000'/%3E%3C/svg%3E",
          alt: "Promo still",
          caption: "Main visual",
        }}
      />,
    );

    expect(screen.getByText("Main visual")).toBeInTheDocument();
  });

  it("renders supported inline markdown inside text blocks", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "text-1",
          blockType: "text",
          content:
            "**bold** _italic_ ~~strike~~ [site](https://example.com)",
          displayOrder: 10,
        }}
      />,
    );

    expect(screen.getByText("bold", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("italic", { selector: "em" })).toBeInTheDocument();
    expect(screen.getByText("strike", { selector: "del" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "site" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByRole("link", { name: "site" })).toHaveAttribute("target", "_blank");
  });

  it("shows invalid markdown as plain text", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "text-2",
          blockType: "text",
          content: "Broken [link](not a url",
          displayOrder: 20,
        }}
      />,
    );

    expect(screen.getByText("Broken [link](not a url")).toBeInTheDocument();
  });

  it("renders line breaks inside text blocks", () => {
    const { container } = render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "text-3",
          blockType: "text",
          content: "first line\nsecond line",
          displayOrder: 30,
        }}
      />,
    );
    const textBlock = container.querySelector("p");

    expect(textBlock).not.toBeNull();
    expect(textBlock).toHaveTextContent("first linesecond line");
    expect(container.querySelector("br")).not.toBeNull();
  });

  it("applies wrapping classes to long text blocks and inline links", () => {
    const { container } = render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "text-long-url",
          blockType: "text",
          content: `weverse.io (${longUrl}) [source](${longUrl})`,
          displayOrder: 40,
        }}
      />,
    );

    expectWrappedText(container.querySelector("p"));
    expectWrappedText(screen.getByRole("link", { name: "source" }));
  });

  it("applies wrapping classes to long list items", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "list-long-url",
          blockType: "list",
          displayOrder: 50,
          listType: "bullet",
          items: [`title (${longUrl})`],
        }}
      />,
    );

    expectWrappedText(screen.getByText(`title (${longUrl})`));
  });

  it("applies wrapping classes to long quote content", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "quote-long-url",
          blockType: "quote",
          content: longUrl,
          displayOrder: 60,
          source: `source-${longUrl}`,
        }}
      />,
    );

    expectWrappedText(screen.getByText(longUrl));
    expectWrappedText(screen.getByText(`source-${longUrl}`));
  });

  it("applies wrapping classes to long table header and cell content", () => {
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "table-long-url",
          blockType: "table",
          displayOrder: 70,
          headers: [longUrl],
          headerCells: [{ content: longUrl }],
          rows: [[`cell-${longUrl}`]],
          rowCells: [[{ content: `cell-${longUrl}` }]],
          tableWidth: 320,
        }}
      />,
    );

    expectWrappedText(screen.getByText(longUrl, { selector: "th" }));
    expectWrappedText(screen.getByText(`cell-${longUrl}`, { selector: "td" }));
  });
});
