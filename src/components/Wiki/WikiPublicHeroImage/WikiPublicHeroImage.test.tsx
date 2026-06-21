import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiPublicHeroImage } from "./index";

describe("WikiPublicHeroImage", () => {
  afterEach(() => cleanup());

  it("renders the mobile flip helper copy outside the card", () => {
    render(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.getByText("Tap anywhere on the card to flip to the basic details.")).toBeInTheDocument();
    expect(screen.queryByText("Flip to reveal the basic profile")).not.toBeInTheDocument();
  });

  it("toggles the mobile helper copy when flipped", () => {
    render(
      <WikiPublicHeroImage
        basic={wikiStoryBasic}
        flipCardId="public-flip-card"
        heroImage={wikiStoryHeroImage}
      />,
    );

    fireEvent.click(screen.getAllByTestId("wiki-flip-input")[0]);

    expect(screen.getByText("Tap the card again to return to the cover image.")).toBeInTheDocument();
  });
});
