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
});
