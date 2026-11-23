import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWikiBlock, googleTrendsTimeRangeOptions } from "@kpool/wiki";
import { I18nProvider } from "@/i18n/I18nProvider";

import { wikiStoryTextBlock, wikiStoryImageBlock } from "../storybook/fixtures";
import { WikiBlockEditorItem } from "./index";

vi.mock("next/script", () => ({ default: () => null }));

describe("WikiBlockEditorItem", () => {
  afterEach(() => cleanup());

  it.each(googleTrendsTimeRangeOptions)("saves inline Google Trends region and period $value", ({ value }) => {
    const onSave = vi.fn();
    const onDelete = vi.fn();
    const block = createWikiBlock("google_trends", 10, { name: "TWICE", language: "ja" });
    render(<I18nProvider initialLocale="en"><WikiBlockEditorItem block={block} isEditing={false} language="ja" onSave={onSave} onDelete={onDelete} onEdit={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
    expect(screen.queryByRole("button", { name: "Edit block: Google Trends" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search term")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Time range")).toHaveValue("today 10-y");
    fireEvent.change(screen.getByLabelText("Time range"), { target: { value } });
    expect(onSave).toHaveBeenLastCalledWith({ searchTerm: "TWICE", region: "JP", timeRange: value });
    fireEvent.change(screen.getByLabelText("Region"), { target: { value: "KR" } });
    expect(onSave).toHaveBeenLastCalledWith({ searchTerm: "TWICE", region: "KR", timeRange: value });
    fireEvent.click(screen.getByRole("button", { name: "Delete block: Google Trends" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("locks inline Google Trends settings while editing is disabled", () => {
    const onSave = vi.fn();
    const block = createWikiBlock("google_trends", 10, { name: "TWICE", language: "ja" });
    render(<I18nProvider initialLocale="en"><WikiBlockEditorItem block={block} disabled isEditing={false} language="ja" onSave={onSave} onDelete={vi.fn()} onEdit={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
    expect(screen.getByLabelText("Region")).toBeDisabled();
    expect(screen.getByLabelText("Time range")).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not open image selection while editing is locked", () => {
    const onRequestImage = vi.fn();
    render(<WikiBlockEditorItem block={wikiStoryImageBlock} disabled isEditing={false} language="ja" onRequestImage={onRequestImage} onCancel={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Wiki画像ライブラリを開く/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("img"));
    expect(onRequestImage).not.toHaveBeenCalled();
  });

  it("renders view controls", () => {
    render(
      <WikiBlockEditorItem
        block={wikiStoryTextBlock}
        isEditing={false}
        language="ja"
        onCancel={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "ブロックを編集: テキスト" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ブロックを削除: テキスト" })).toBeInTheDocument();
  });

  it("calls edit and delete handlers", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <WikiBlockEditorItem
        block={wikiStoryTextBlock}
        isEditing={false}
        language="ja"
        onCancel={() => {}}
        onDelete={onDelete}
        onEdit={onEdit}
        onSave={() => {}}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "ブロックを編集: テキスト" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "ブロックを削除: テキスト" })[0]);

    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("disables edit and delete handlers", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <WikiBlockEditorItem
        block={wikiStoryTextBlock}
        disabled
        isEditing={false}
        language="ja"
        onCancel={() => {}}
        onDelete={onDelete}
        onEdit={onEdit}
        onSave={() => {}}
      />,
    );

    const editButton = screen.getAllByRole("button", { name: "ブロックを編集: テキスト" })[0];
    const deleteButton = screen.getAllByRole("button", { name: "ブロックを削除: テキスト" })[0];

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
