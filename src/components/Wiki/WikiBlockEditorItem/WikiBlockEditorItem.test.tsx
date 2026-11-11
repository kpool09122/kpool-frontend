import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryTextBlock, wikiStoryImageBlock } from "../storybook/fixtures";
import { WikiBlockEditorItem } from "./index";

describe("WikiBlockEditorItem", () => {
  afterEach(() => cleanup());

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
