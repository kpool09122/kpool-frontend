import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStorySection } from "../storybook/fixtures";
import { WikiAddContentControls } from "./index";

describe("WikiAddContentControls", () => {
  afterEach(() => cleanup());

  it("adds a section and a block", () => {
    const onAddSection = vi.fn();
    const onAddBlock = vi.fn();

    render(
      <WikiAddContentControls
        onAddBlock={onAddBlock}
        onAddSection={onAddSection}
        section={wikiStorySection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Section" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Block" }));
    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    expect(onAddSection).toHaveBeenCalledWith(wikiStorySection.sectionIdentifier);
    expect(onAddBlock).toHaveBeenCalledWith(wikiStorySection.sectionIdentifier, "text");
  });

  it("disables section creation at max depth", () => {
    const { getByTestId } = render(
      <WikiAddContentControls
        onAddBlock={() => {}}
        onAddSection={() => {}}
        section={{
          ...wikiStorySection,
          sectionIdentifier: "depth-3",
          depth: 3,
        }}
      />,
    );

    const controls = getByTestId("wiki-edit-add-section-depth-3");

    expect(within(controls).getByRole("button", { name: "+ Section" })).toBeDisabled();
    expect(screen.getByText("Max depth reached")).toBeInTheDocument();
  });

  it("disables section and block creation", () => {
    const onAddSection = vi.fn();
    const onAddBlock = vi.fn();

    render(
      <WikiAddContentControls
        disabled
        onAddBlock={onAddBlock}
        onAddSection={onAddSection}
        section={wikiStorySection}
      />,
    );

    const addSectionButton = screen.getByRole("button", { name: "+ Section" });
    const addBlockButton = screen.getByRole("button", { name: "+ Block" });

    expect(addSectionButton).toBeDisabled();
    expect(addBlockButton).toBeDisabled();

    fireEvent.click(addSectionButton);
    fireEvent.click(addBlockButton);

    expect(onAddSection).not.toHaveBeenCalled();
    expect(onAddBlock).not.toHaveBeenCalled();
  });
});
