import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryDetail } from "../storybook/fixtures";
import { WikiEditSidebar } from "./index";

describe("WikiEditSidebar", () => {
  afterEach(() => cleanup());

  it("fires sidebar actions and setting updates", () => {
    const onEditorModeChange = vi.fn();
    const onClear = vi.fn();
    const onPreviewModeChange = vi.fn();
    const onSave = vi.fn();
    const onSubmit = vi.fn();
    const onToggle = vi.fn();
    const onUpdateSettings = vi.fn();

    render(
      <WikiEditSidebar
        canPersist
        editorMode="gui"
        isBusy={false}
        isOpen
        onEditorModeChange={onEditorModeChange}
        onClear={onClear}
        onPreviewModeChange={onPreviewModeChange}
        onSave={onSave}
        onSubmit={onSubmit}
        onToggle={onToggle}
        onUpdateSettings={onUpdateSettings}
        previewMode="light"
        resourceType="group"
        slug={wikiStoryDetail.slug}
        themeColor={wikiStoryDetail.themeColor}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));
    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse editor sidebar" }));
    expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "song" },
    });

    expect(onSave).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
    expect(onEditorModeChange).toHaveBeenCalledWith("code");
    expect(onPreviewModeChange).toHaveBeenCalledWith("dark");
    expect(onToggle).toHaveBeenCalled();
    expect(onUpdateSettings).toHaveBeenCalledWith({ resourceType: "song" });
  });

  it("disables save, submit, and editing controls while review locked", () => {
    const onEditorModeChange = vi.fn();
    const onClear = vi.fn();
    const onPreviewModeChange = vi.fn();
    const onSave = vi.fn();
    const onSubmit = vi.fn();
    const onToggle = vi.fn();
    const onUpdateSettings = vi.fn();

    render(
      <WikiEditSidebar
        canPersist
        editorMode="gui"
        isBusy={false}
        isOpen
        isReviewLocked
        onEditorModeChange={onEditorModeChange}
        onClear={onClear}
        onPreviewModeChange={onPreviewModeChange}
        onSave={onSave}
        onSubmit={onSubmit}
        onToggle={onToggle}
        onUpdateSettings={onUpdateSettings}
        previewMode="light"
        resourceType="group"
        slug={wikiStoryDetail.slug}
        themeColor={wikiStoryDetail.themeColor}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save wiki changes" });
    const submitButton = screen.getByRole("button", { name: "Submit wiki for review" });
    const clearButton = screen.getByRole("button", { name: "Clear wiki changes" });
    const codeButton = screen.getByRole("button", { name: "code" });
    const previewDarkButton = screen.getByRole("button", { name: "Dark" });
    const resourceTypeSelect = screen.getByLabelText("Resource type");
    const themeColorInput = screen.getByLabelText("Theme color");

    expect(saveButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Under review");
    expect(clearButton).toBeDisabled();
    expect(codeButton).toBeDisabled();
    expect(resourceTypeSelect).toBeDisabled();
    expect(themeColorInput).toBeDisabled();

    fireEvent.click(saveButton);
    fireEvent.click(submitButton);
    fireEvent.click(clearButton);
    fireEvent.click(codeButton);
    fireEvent.change(resourceTypeSelect, {
      target: { value: "song" },
    });
    fireEvent.click(previewDarkButton);

    expect(onSave).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(onEditorModeChange).not.toHaveBeenCalled();
    expect(onUpdateSettings).not.toHaveBeenCalled();
    expect(onPreviewModeChange).toHaveBeenCalledWith("dark");
  });
});
