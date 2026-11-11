import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroPanel } from "./index";

describe("WikiHeroPanel", () => {
  afterEach(() => cleanup());

  it("renders the hero image in view mode", () => {
    render(
      <WikiHeroPanel
        heroImage={wikiStoryHeroImage}
      />,
    );

    expect(screen.getByRole("img", { name: wikiStoryHeroImage.alt })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wiki画像ライブラリを開く" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hero image URL")).not.toBeInTheDocument();
  });

  it("opens the image library from the transparent overlay in edit mode", () => {
    const onOpenImageLibrary = vi.fn();
    render(
      <WikiHeroPanel
        heroImage={wikiStoryHeroImage}
        onOpenImageLibrary={onOpenImageLibrary}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wiki画像ライブラリを開く" }));

    expect(onOpenImageLibrary).toHaveBeenCalledTimes(1);
  });
});
