import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n/I18nProvider";

import { wikiStoryDetail } from "../storybook/fixtures";
import { WikiEditSidebar } from "./index";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

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

    renderWithI18n(
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
        language="ja"
        resourceType="group"
        slug={wikiStoryDetail.slug}
        themeColor={wikiStoryDetail.themeColor}
        fontStyle="ja_gothic"
        title="Aurora Echo SEO"
        metaDescription="Aurora Echo meta description"
        keywords={["aurora", "echo"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));
    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse editor sidebar" }));
    expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument();
    const fontStyleSelect = screen.getByLabelText("Font style");
    expect(fontStyleSelect).toHaveValue("ja_gothic");
    expect(screen.getByRole("option", { name: "Default font" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "JP Pop" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "KR Gothic" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "EN Serif" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "song" },
    });
    fireEvent.change(fontStyleSelect, {
      target: { value: "ja_mincho" },
    });
    fireEvent.change(screen.getByLabelText("Metadata title"), {
      target: { value: "Updated SEO title" },
    });
    fireEvent.change(screen.getByLabelText("Metadata meta description"), {
      target: { value: "Updated meta description" },
    });
    expect(screen.getByLabelText("Metadata title")).toHaveAttribute("maxlength", "40");
    expect(screen.getByLabelText("Metadata meta description")).toHaveAttribute("maxlength", "140");
    expect(screen.getByLabelText("Keyword 1")).toHaveAttribute("maxlength", "20");
    expect(screen.getByText("15 / 40")).toBeInTheDocument();
    expect(screen.getByText("28 / 140")).toBeInTheDocument();
    expect(screen.getByText("6 / 20")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Keyword 1"), {
      target: { value: "updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add keyword" }));
    fireEvent.change(screen.getByLabelText("Keyword 3"), {
      target: { value: "seo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove keyword 2" }));

    expect(onSave).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
    expect(onEditorModeChange).toHaveBeenCalledWith("code");
    expect(onPreviewModeChange).toHaveBeenCalledWith("dark");
    expect(onToggle).toHaveBeenCalled();
    expect(onUpdateSettings).toHaveBeenCalledWith({ resourceType: "song" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ fontStyle: "ja_mincho" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ title: "Updated SEO title" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ metaDescription: "Updated meta description" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ keywords: ["updated", "echo"] });
    expect(onUpdateSettings).toHaveBeenCalledWith({ keywords: ["updated", "echo", "seo"] });
    expect(onUpdateSettings).toHaveBeenCalledWith({ keywords: ["updated", "seo"] });
  });

  it("disables save, submit, and editing controls while review locked", () => {
    const onEditorModeChange = vi.fn();
    const onClear = vi.fn();
    const onPreviewModeChange = vi.fn();
    const onSave = vi.fn();
    const onSubmit = vi.fn();
    const onToggle = vi.fn();
    const onUpdateSettings = vi.fn();

    renderWithI18n(
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
        language="ja"
        resourceType="group"
        slug={wikiStoryDetail.slug}
        themeColor={wikiStoryDetail.themeColor}
        fontStyle="ja_gothic"
        title="Aurora Echo SEO"
        metaDescription="Aurora Echo meta description"
        keywords={["aurora", "echo"]}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save wiki changes" });
    const submitButton = screen.getByRole("button", { name: "Submit wiki for review" });
    const clearButton = screen.getByRole("button", { name: "Clear wiki changes" });
    const codeButton = screen.getByRole("button", { name: "code" });
    const previewDarkButton = screen.getByRole("button", { name: "Dark" });
    const resourceTypeSelect = screen.getByLabelText("Resource type");
    const themeColorInput = screen.getByLabelText("Theme color");
    const fontStyleSelect = screen.getByLabelText("Font style");
    const seoTitleInput = screen.getByLabelText("Metadata title");
    const metaDescriptionInput = screen.getByLabelText("Metadata meta description");
    const keywordsInput = screen.getByLabelText("Keyword 1");
    const removeKeywordButton = screen.getByRole("button", { name: "Remove keyword 1" });
    const addKeywordButton = screen.getByRole("button", { name: "Add keyword" });

    expect(saveButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Under review");
    expect(clearButton).toBeDisabled();
    expect(codeButton).toBeDisabled();
    expect(resourceTypeSelect).toBeDisabled();
    expect(themeColorInput).toBeDisabled();
    expect(fontStyleSelect).toBeDisabled();
    expect(seoTitleInput).toBeDisabled();
    expect(metaDescriptionInput).toBeDisabled();
    expect(keywordsInput).toBeDisabled();
    expect(removeKeywordButton).toBeDisabled();
    expect(addKeywordButton).toBeDisabled();

    fireEvent.click(saveButton);
    fireEvent.click(submitButton);
    fireEvent.click(clearButton);
    fireEvent.click(codeButton);
    fireEvent.change(resourceTypeSelect, {
      target: { value: "song" },
    });
    fireEvent.change(fontStyleSelect, {
      target: { value: "ja_mincho" },
    });
    fireEvent.click(previewDarkButton);

    expect(onSave).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(onEditorModeChange).not.toHaveBeenCalled();
    expect(onUpdateSettings).not.toHaveBeenCalled();
    expect(onPreviewModeChange).toHaveBeenCalledWith("dark");
  });

  it("disables editor mode controls while inline edits are pending", () => {
    const onEditorModeChange = vi.fn();

    renderWithI18n(
      <WikiEditSidebar
        canPersist
        editorMode="gui"
        isBusy={false}
        isEditorModeDisabled
        isOpen
        onEditorModeChange={onEditorModeChange}
        onClear={vi.fn()}
        onPreviewModeChange={vi.fn()}
        onSave={vi.fn()}
        onSubmit={vi.fn()}
        onToggle={vi.fn()}
        onUpdateSettings={vi.fn()}
        previewMode="light"
        language="ja"
        resourceType="group"
        slug={wikiStoryDetail.slug}
        themeColor={wikiStoryDetail.themeColor}
        fontStyle="ja_gothic"
        title="Aurora Echo SEO"
        metaDescription="Aurora Echo meta description"
        keywords={["aurora", "echo"]}
      />,
    );

    const codeButton = screen.getByRole("button", { name: "code" });

    expect(codeButton).toBeDisabled();
    fireEvent.click(codeButton);
    expect(onEditorModeChange).not.toHaveBeenCalled();
  });
});
