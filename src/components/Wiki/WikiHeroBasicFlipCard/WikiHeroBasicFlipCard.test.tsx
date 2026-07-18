import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n/I18nProvider";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroBasicFlipCard } from "./index";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

describe("WikiHeroBasicFlipCard", () => {
  afterEach(() => cleanup());

  it("triggers flip changes from the front label", () => {
    const onFlipChange = vi.fn();

    renderWithI18n(
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
    renderWithI18n(
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
