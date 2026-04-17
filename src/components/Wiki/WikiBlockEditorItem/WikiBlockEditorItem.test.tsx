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
        onCancel={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit text block" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete text block" })).toBeInTheDocument();
  });

  it("calls edit and delete handlers", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <WikiBlockEditorItem
        block={wikiStoryTextBlock}
        isEditing={false}
        onCancel={() => {}}
        onDelete={onDelete}
        onEdit={onEdit}
        onSave={() => {}}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Edit text block" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete text block" })[0]);

    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
