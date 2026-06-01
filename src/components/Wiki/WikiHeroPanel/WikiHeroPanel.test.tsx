import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroPanel } from "./index";

describe("WikiHeroPanel", () => {
  it("renders the hero image in view mode", () => {
    render(
      <WikiHeroPanel
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.getByRole("img", { name: wikiStoryHeroImage.alt })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit hero image" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hero image URL")).not.toBeInTheDocument();
  });
});
