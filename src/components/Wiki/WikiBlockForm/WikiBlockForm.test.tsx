import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryTextBlock, wikiStoryTableBlock } from "../storybook/fixtures";
import { WikiBlockForm } from "./index";

describe("WikiBlockForm", () => {
  afterEach(() => cleanup());

  it("submits text block changes", () => {
    const onSave = vi.fn();

    render(<WikiBlockForm block={wikiStoryTextBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "Updated body" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith({ content: "Updated body" });
  });

  it("submits parsed table rows", () => {
    const onSave = vi.fn();

    render(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "Album, 2024" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [["Album", "2024"]],
      }),
    );
  });
});
