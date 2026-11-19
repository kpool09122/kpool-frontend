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
        profileLabel="プロフィール"
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

    expect(screen.getByText("プロフィール", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View basic details" })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("wiki-edit-flip-front-toggle"));
    fireEvent.click(screen.getByTestId("wiki-edit-flip-input"));

    expect(onFlipChange).toHaveBeenCalled();
  });

  it("uses the public Wiki label to return to the photo", () => {
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

    expect(screen.getByRole("button", { name: "Back to photo" })).toBeInTheDocument();
  });
});
