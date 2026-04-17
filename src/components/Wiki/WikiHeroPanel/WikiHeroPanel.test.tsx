import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroPanel } from "./index";

describe("WikiHeroPanel", () => {
  it("renders the hero image in view mode", () => {
    render(
      <WikiHeroPanel
        heroImage={wikiStoryHeroImage}
        isEditing={false}
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole("img", { name: wikiStoryHeroImage.alt })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit hero image" })).toBeInTheDocument();
  });

  it("submits edited hero image fields", () => {
    const onSave = vi.fn();

    render(
      <WikiHeroPanel
        heroImage={wikiStoryHeroImage}
        isEditing
        onCancel={() => {}}
        onEdit={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Hero image URL"), {
      target: { value: "https://example.com/new-image.jpg" },
    });
    fireEvent.change(screen.getByLabelText("Hero image alt"), {
      target: { value: "Updated alt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      src: "https://example.com/new-image.jpg",
      alt: "Updated alt",
    });
  });
});
