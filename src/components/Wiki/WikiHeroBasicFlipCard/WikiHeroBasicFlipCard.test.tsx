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
        isHeroEditing={false}
        onCancel={() => {}}
        onEditBasic={() => {}}
        onEditHero={() => {}}
        onFlipChange={onFlipChange}
        onSaveBasic={() => {}}
        onSaveHero={() => {}}
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
        isHeroEditing={false}
        onCancel={() => {}}
        onEditBasic={() => {}}
        onEditHero={() => {}}
        onFlipChange={() => {}}
        onSaveBasic={() => {}}
        onSaveHero={() => {}}
      />,
    );

    expect(
      screen.getAllByText("Tap outside the form area to return to the cover image.").length,
    ).toBeGreaterThan(0);
  });
});
