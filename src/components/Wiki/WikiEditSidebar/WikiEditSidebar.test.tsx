import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { wikiStoryDetail } from "../storybook/fixtures";
import { WikiEditSidebar } from "./index";

describe("WikiEditSidebar", () => {
  it("fires sidebar actions and setting updates", () => {
    const onClear = vi.fn();
    const onPreviewModeChange = vi.fn();
    const onSave = vi.fn();
    const onSubmit = vi.fn();
    const onToggle = vi.fn();
    const onUpdateSettings = vi.fn();

    render(
      <WikiEditSidebar
        isBusy={false}
        isOpen
        onClear={onClear}
        onPreviewModeChange={onPreviewModeChange}
        onSave={onSave}
        onSubmit={onSubmit}
        onToggle={onToggle}
        onUpdateSettings={onUpdateSettings}
        previewMode="light"
        slug={wikiStoryDetail.slug}
        themeColor={wikiStoryDetail.themeColor}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse editor sidebar" }));
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "new-slug" },
    });

    expect(onSave).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
    expect(onPreviewModeChange).toHaveBeenCalledWith("dark");
    expect(onToggle).toHaveBeenCalled();
    expect(onUpdateSettings).toHaveBeenCalledWith({ slug: "new-slug" });
  });
});
