import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WikiBlockDisplay } from "./index";

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
    render(
      <WikiBlockDisplay
        block={{
          blockIdentifier: "table-1",
          blockType: "table",
          displayOrder: 20,
          headers: ["Role", "Member"],
          rows: [["Leader", "Mina"]],
        }}
      />,
    );

    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Leader")).toBeInTheDocument();
    expect(screen.getByText("Mina")).toBeInTheDocument();
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
});
