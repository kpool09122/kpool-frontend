import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroBasicFlipCard } from "./index";

describe("WikiHeroBasicFlipCard", () => {
  afterEach(() => cleanup());

  it("triggers flip changes from the front label", () => {
    const onFlipChange = vi.fn();

    render(
      <WikiHeroBasicFlipCard
        basic={wikiStoryBasic}
        flipCardId="test-flip-card"
        heroImage={wikiStoryHeroImage}
        isBasicEditing={false}
        isFlipped={false}
        onCancel={() => {}}
        onEditBasic={() => {}}
        onFlipChange={onFlipChange}
        onSaveBasic={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId("wiki-edit-flip-front-toggle"));
    fireEvent.click(screen.getByTestId("wiki-edit-flip-input"));

    expect(onFlipChange).toHaveBeenCalled();
  });

  it("renders the flipped helper copy", () => {
    render(
      <WikiHeroBasicFlipCard
        basic={wikiStoryBasic}
        flipCardId="test-flip-card"
        heroImage={wikiStoryHeroImage}
        isBasicEditing={false}
        isFlipped
        onCancel={() => {}}
        onEditBasic={() => {}}
        onFlipChange={() => {}}
        onSaveBasic={() => {}}
      />,
    );

    expect(
      screen.getAllByText("Tap outside the form area to return to the cover image.").length,
    ).toBeGreaterThan(0);
  });
});
