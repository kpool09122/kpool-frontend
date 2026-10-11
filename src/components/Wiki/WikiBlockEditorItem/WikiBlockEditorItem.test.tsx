import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryTextBlock } from "../storybook/fixtures";
import { WikiBlockEditorItem } from "./index";

describe("WikiBlockEditorItem", () => {
  afterEach(() => cleanup());

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
