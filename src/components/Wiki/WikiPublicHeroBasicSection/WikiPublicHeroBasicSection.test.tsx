import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiPublicHeroBasicSection } from "./index";

describe("WikiPublicHeroBasicSection", () => {
  afterEach(() => cleanup());

  it("renders the hero intro copy", () => {
    render(
      <WikiPublicHeroBasicSection
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.getByText("Flip to reveal the basic profile")).toBeInTheDocument();
  });

  it("toggles the mobile helper copy when flipped", () => {
    render(
      <WikiPublicHeroBasicSection
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    fireEvent.click(screen.getAllByTestId("wiki-flip-input")[0]);

    expect(screen.getByText("Tap the card again to return to the cover image.")).toBeInTheDocument();
  });
});
