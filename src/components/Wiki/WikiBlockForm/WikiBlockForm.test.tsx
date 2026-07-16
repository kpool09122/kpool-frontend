import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wikiStoryProfileListBlock, wikiStoryTextBlock, wikiStoryTableBlock } from "../storybook/fixtures";
import { WikiBlockForm } from "./index";

describe("WikiBlockForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

    expect(screen.getByRole("dialog")).toHaveClass("left-0");
    expect(screen.getByLabelText("Link destination")).toBeInTheDocument();
  });

  it("opens the link editor from a list item toolbar", () => {
    render(
      <WikiBlockForm
        block={{
          blockIdentifier: "list-1",
          blockType: "list",
          displayOrder: 10,
          items: ["First item"],
          listType: "bullet",
        }}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Link destination")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));

    expect(screen.getByRole("dialog")).toHaveClass("left-0");
    expect(screen.getByLabelText("Link destination")).toBeInTheDocument();
  });

  it("closes the previous list link popover when another one opens", () => {
    render(
      <WikiBlockForm
        block={{
          blockIdentifier: "list-2",
          blockType: "list",
          displayOrder: 10,
          items: ["First item", "Second item"],
          listType: "bullet",
        }}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    );
    const linkButtons = screen.getAllByRole("button", { name: "Insert link" });

    fireEvent.click(linkButtons[0]);

    expect(linkButtons[0]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    fireEvent.click(linkButtons[1]);

    expect(linkButtons[0]).toHaveAttribute("aria-expanded", "false");
    expect(linkButtons[1]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("submits list item inline markdown without requiring raw textarea editing", () => {
    const onSave = vi.fn();

    render(
      <WikiBlockForm
        block={{
          blockIdentifier: "list-2",
          blockType: "list",
          displayOrder: 10,
          items: ["**bold** _italic_ ~~strike~~ [site](https://example.com)"],
          listType: "numbered",
        }}
        onCancel={() => {}}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Items")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      items: ["**bold** _italic_ ~~strike~~ [site](https://example.com)"],
      listType: "numbered",
    });
  });

  it("loads related profile slugs from selected resource type", async () => {
    const onSave = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          profiles: [
            {
              wikiIdentifier: "11111111-1111-1111-1111-111111111111",
              slug: "tl-momo",
              language: "ja",
              resourceType: "talent",
              name: "MOMO",
              normalizedName: "momo",
              imageIdentifier: null,
              imageUrl: null,
              imageAltText: null,
            },
            {
              wikiIdentifier: "22222222-2222-2222-2222-222222222222",
              slug: "tl-sana",
              language: "ja",
              resourceType: "talent",
              name: "SANA",
              normalizedName: "sana",
              imageIdentifier: "33333333-3333-3333-3333-333333333333",
              imageUrl: "https://upload.wikimedia.org/wikipedia/commons/example/sana.jpg",
              imageAltText: "SANA profile",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WikiBlockForm
        block={wikiStoryProfileListBlock}
        onCancel={() => {}}
        onSave={onSave}
        sourceWiki={{ language: "ja", resourceType: "group", slug: "gr-twice" }}
      />,
    );

    const resourceTypeSelect = screen.getByLabelText("Resource type") as HTMLSelectElement;

    expect([...resourceTypeSelect.options].map((option) => option.value)).not.toContain("group");
    fireEvent.change(resourceTypeSelect, {
      target: { value: "talent" },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("MOMO")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load related profiles" }));

    expect(await screen.findByText("MOMO")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "SANA profile" })).toHaveAttribute(
      "src",
      "https://upload.wikimedia.org/wikipedia/commons/example/sana.jpg",
    );
    expect(screen.queryByText("tl-sana")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Wiki slugs")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/ja/gr-twice/related-profiles?resourceType=talent",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedResourceType: "talent",
          profiles: [
            expect.objectContaining({
              name: "MOMO",
              slug: "tl-momo",
            }),
            expect.objectContaining({
              imageIdentifier: "33333333-3333-3333-3333-333333333333",
              imageUrl: "https://upload.wikimedia.org/wikipedia/commons/example/sana.jpg",
              name: "SANA",
              slug: "tl-sana",
            }),
          ],
          wikiIdentifiers: [
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
          ],
        }),
      ),
    );
  });

  it("shows an empty related profiles state without destroying existing slugs", async () => {
    const onSave = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ profiles: [] }), {
          status: 200,
        }),
      ),
    );

    render(
      <WikiBlockForm
        block={wikiStoryProfileListBlock}
        onCancel={() => {}}
        onSave={onSave}
        sourceWiki={{ language: "ja", resourceType: "group", slug: "gr-twice" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "talent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load related profiles" }));

    expect(await screen.findByText("関連プロフィールはありません")).toBeInTheDocument();
    expect(screen.queryByLabelText("Wiki slugs")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        profiles: [],
        wikiIdentifiers: [],
      }),
    );
  });

  it("does not submit stale profiles after changing resource type before loading", () => {
    const onSave = vi.fn();
    const block = {
      ...wikiStoryProfileListBlock,
      relatedResourceType: "talent",
      wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
      profiles: [
        {
          wikiIdentifier: "11111111-1111-1111-1111-111111111111",
          slug: "tl-momo",
          language: "ja",
          resourceType: "talent",
          name: "MOMO",
          normalizedName: "momo",
          imageUrl: null,
          imageAltText: null,
        },
      ],
    } as typeof wikiStoryProfileListBlock;

    render(
      <WikiBlockForm
        block={block}
        onCancel={() => {}}
        onSave={onSave}
        sourceWiki={{ language: "ja", resourceType: "group", slug: "gr-twice" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "agency" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        relatedResourceType: "agency",
        profiles: [],
        wikiIdentifiers: [],
      }),
    );
  });

  it("shows a generic related profiles error when loading fails", async () => {
    const onSave = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Related profiles failed" }), {
          status: 500,
        }),
      ),
    );

    render(
      <WikiBlockForm
        block={wikiStoryProfileListBlock}
        onCancel={() => {}}
        onSave={onSave}
        sourceWiki={{ language: "ja", resourceType: "group", slug: "gr-twice" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "talent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load related profiles" }));

    expect(await screen.findByText("関連プロフィールの取得に失敗しました")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        profiles: [],
        wikiIdentifiers: [],
      }),
    );
  });
});
