import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryTextBlock, wikiStoryTableBlock } from "../storybook/fixtures";
import { WikiBlockForm } from "./index";

describe("WikiBlockForm", () => {
  afterEach(() => cleanup());

  it("submits text block content", () => {
    const onSave = vi.fn();

    render(<WikiBlockForm block={wikiStoryTextBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith({
      content:
        "The group balances brisk digital singles with a smaller number of concept-heavy mini albums.",
    });
  });

  it("submits structured table cell edits", () => {
    const onSave = vi.fn();

    render(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Row 1 cell 1"), {
      target: { value: "Album" },
    });
    fireEvent.change(screen.getByLabelText("Row 1 cell 2"), {
      target: { value: "2024" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCells: [[{ content: "Album" }, { content: "2024" }]],
        rows: [["Album", "2024"]],
      }),
    );
  });

  it("submits table width changes", () => {
    const onSave = vi.fn();

    render(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Table width"), {
      target: { value: "320" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tableWidth: 320,
      }),
    );
  });

  it("adds a column and preserves structured cells", () => {
    const onSave = vi.fn();

    render(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Column" }));
    fireEvent.change(screen.getByLabelText("Row 1 cell 1"), {
      target: { value: "Aurora Echo" },
    });
    fireEvent.change(screen.getByLabelText("Row 1 cell 2"), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByLabelText("Header cell 3"), {
      target: { value: "Notes" },
    });
    fireEvent.change(screen.getByLabelText("Row 1 cell 3"), {
      target: { value: "Lead single" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        headerCells: [{ content: "Release" }, { content: "Year" }, { content: "Notes" }],
        rowCells: [[{ content: "Aurora Echo" }, { content: "2024" }, { content: "Lead single" }]],
      }),
    );
  });

  it("connects horizontally selected cells", () => {
    const onSave = vi.fn();
    const block = {
      ...wikiStoryTableBlock,
      headers: ["Release", "Year"],
      headerCells: [{ content: "Release" }, { content: "Year" }],
      rows: [["Aurora Echo", "2024"]],
      rowCells: [[{ content: "Aurora Echo" }, { content: "2024" }]],
    };

    render(<WikiBlockForm block={block} onCancel={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText("Row 1 cell 1"));
    fireEvent.click(screen.getByLabelText("Row 1 cell 2"), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "+ Connect" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCells: [[{ content: "Aurora Echo", colspan: 2 }]],
        rows: [["Aurora Echo"]],
      }),
    );
  });

  it("cancels a connected cell from the toolbar", () => {
    const onSave = vi.fn();
    const block = {
      ...wikiStoryTableBlock,
      headers: ["Release", "Year"],
      headerCells: [{ content: "Release" }, { content: "Year" }],
      rows: [["Aurora Echo"]],
      rowCells: [[{ content: "Aurora Echo", colspan: 2 }]],
    };

    render(<WikiBlockForm block={block} onCancel={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText("Row 1 cell 1"));
    fireEvent.click(screen.getByRole("button", { name: "+ Cancel connect" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCells: [[{ content: "Aurora Echo" }, { content: "" }]],
        rows: [["Aurora Echo", ""]],
      }),
    );
  });

  it("opens the link editor from the toolbar", () => {
    render(<WikiBlockForm block={wikiStoryTextBlock} onCancel={() => {}} onSave={() => {}} />);

    expect(screen.queryByLabelText("Link destination")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));

    expect(screen.getByLabelText("Link destination")).toBeInTheDocument();
  });
});
