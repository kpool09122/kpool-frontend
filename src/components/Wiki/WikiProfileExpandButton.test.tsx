import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nProvider";
import { WikiHeroBasicFlipCard } from "./WikiHeroBasicFlipCard";
import { WikiPublicHeroImage } from "./WikiPublicHeroImage";
import { wikiStoryBasic, wikiStoryHeroImage } from "./storybook/fixtures";

afterEach(cleanup);

describe.each(["public", "editor"] as const)("expanded profile in the %s card", (variant) => {
  const setup = () => {
    const onFlipChange = vi.fn();
    const onEdit = vi.fn();
    const props = {
      basic: wikiStoryBasic,
      heroImage: wikiStoryHeroImage,
      language: "en",
      profileLabel: "Artist profile",
      flipCardId: `${variant}-profile`,
    };
    render(
      <I18nProvider initialLocale="en">
        <div className="wiki-theme-scope" data-testid="wiki-theme">
          {variant === "public" ? (
            <WikiPublicHeroImage {...props} editHref="/edit" onEdit={onEdit} />
          ) : (
            <WikiHeroBasicFlipCard
              {...props}
              isFlipped
              isBasicEditing={false}
              onFlipChange={onFlipChange}
              onEditBasic={onEdit}
              onCancel={() => {}}
              onSaveBasic={() => {}}
            />
          )}
        </div>
      </I18nProvider>,
    );
    if (variant === "public") fireEvent.click(screen.getByRole("button", { name: "View basic details" }));
    const trigger = screen.getByRole("button", { name: "Expand profile" });
    trigger.focus();
    fireEvent.click(trigger);
    return { trigger, onFlipChange, onEdit };
  };

  it("opens the full profile outside the flip card and closes without flipping or editing", async () => {
    const { trigger, onFlipChange, onEdit } = setup();
    const dialog = screen.getByRole("dialog", { name: "Artist profile" });
    expect(within(dialog).getByText(wikiStoryBasic.fandomName!)).toBeInTheDocument();
    expect(dialog.closest('[data-testid="wiki-theme"]')).toBe(screen.getByTestId("wiki-theme"));
    expect(dialog.closest('[data-testid$="flip-card"]')).toBeNull();
    const close = within(dialog).getByRole("button", { name: "Close profile" });
    expect(close).toHaveFocus();
    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onFlipChange).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
    if (variant === "public") expect(screen.getByTestId("wiki-flip-input")).toBeChecked();
  });

  it("closes with Escape and returns focus to the expand button", async () => {
    const { trigger, onFlipChange } = setup();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onFlipChange).not.toHaveBeenCalled();
  });
});
