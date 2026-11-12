import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWikiBlock, type WikiEmbedBlock } from "@kpool/wiki";
import { I18nProvider } from "../../../i18n/I18nProvider";

import { wikiStoryProfileListBlock, wikiStoryTextBlock, wikiStoryTableBlock } from "../storybook/fixtures";
import { WikiBlockForm } from "./index";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

const newEmbed = createWikiBlock("embed", 1) as WikiEmbedBlock;

describe("WikiBlockForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["https://youtu.be/abcdefghijk?t=2", "youtube", "abcdefghijk"],
    ["https://www.youtube.com/shorts/abcdefghijk", "youtube", "abcdefghijk"],
    ["https://www.tiktok.com/@artist/video/6718335390845095173", "tiktok", "6718335390845095173"],
    ["https://open.spotify.com/intl-ja/track/0KGoC1HHJzRTwG1vVcL6Ul?si=share", "spotify", "track/0KGoC1HHJzRTwG1vVcL6Ul"],
    ["https://twitter.com/artist/status/123456789", "x", "123456789"],
  ])("infers the provider and embed ID from %s", (url, provider, embedId) => {
    const onSave = vi.fn();
    renderWithI18n(<WikiBlockForm block={newEmbed} onCancel={vi.fn()} onSave={onSave} />);

    const input = screen.getByRole("textbox", { name: "Embed URL" });
    expect(input).toHaveValue("");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: ` ${url} ` } });
    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "Example" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ provider, embedId, caption: "Example" });
  });

  it("keeps an existing embed when only the caption changes", () => {
    const block = { ...newEmbed, embedId: "abcdefghijk" };
    const onSave = vi.fn();
    renderWithI18n(<WikiBlockForm block={block} onCancel={vi.fn()} onSave={onSave} />);

    expect(screen.getByLabelText("Embed URL")).toHaveValue("https://www.youtube.com/watch?v=abcdefghijk");
    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ caption: "Updated" });
  });

  it("rejects an unsupported URL and accepts a replacement from another provider", () => {
    const block = { ...newEmbed, embedId: "abcdefghijk" };
    const onSave = vi.fn();
    renderWithI18n(<WikiBlockForm block={block} onCancel={vi.fn()} onSave={onSave} />);

    const input = screen.getByLabelText("Embed URL");
    const save = screen.getByRole("button", { name: "Save" });
    fireEvent.change(input, { target: { value: "https://www.youtube.com.example/watch?v=abcdefghijk" } });
    fireEvent.click(save);

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a YouTube, TikTok video page, Spotify, or X post URL.");
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "https://x.com/artist/status/123456789" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({ provider: "x", embedId: "123456789", caption: block.caption });
  });

  it("edits, adds, and removes entries in a history block", () => {
    const onSave = vi.fn();
    renderWithI18n(
      <WikiBlockForm
        block={{
          blockIdentifier: "history-1",
          blockType: "history",
          displayOrder: 10,
          entries: [{ year: 2024, title: "Debut", detail: null }],
        }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Item" }));
    const [, year] = screen.getAllByLabelText("Year");
    const [, title] = screen.getAllByLabelText("Event");
    const [, detail] = screen.getAllByLabelText("Details");
    fireEvent.change(year, { target: { value: "2025" } });
    fireEvent.change(title, { target: { value: "Concert" } });
    fireEvent.change(detail, { target: { value: "Seoul" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove item" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ entries: [{ year: 2025, title: "Concert", detail: "Seoul" }] });
  });

  it("sorts history rows after leaving the year field and preserves their text", () => {
    const onSave = vi.fn();
    renderWithI18n(
      <WikiBlockForm
        block={{
          blockIdentifier: "history-1",
          blockType: "history",
          displayOrder: 10,
          entries: [
            { year: 2023, title: "Debut", detail: null },
            { year: 2024, title: "First award", detail: null },
            { year: 2024, title: "Second award", detail: null },
          ],
        }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    const titles = () => screen.getAllByLabelText<HTMLInputElement>("Event").map((input) => input.value);
    expect(titles()).toEqual(["First award", "Second award", "Debut"]);

    fireEvent.click(screen.getByRole("button", { name: "+ Item" }));
    const year = screen.getAllByLabelText("Year")[3];
    fireEvent.change(screen.getAllByLabelText("Event")[3], { target: { value: "Concert" } });
    fireEvent.change(screen.getAllByLabelText("Details")[3], { target: { value: "Seoul\nEncore" } });
    fireEvent.change(year, { target: { value: "2025" } });
    expect(titles()).toEqual(["First award", "Second award", "Debut", "Concert"]);

    fireEvent.blur(year);
    expect(titles()).toEqual(["Concert", "First award", "Second award", "Debut"]);
    expect(screen.getAllByLabelText("Details")[0]).toHaveValue("Seoul\nEncore");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ entries: [
      { year: 2025, title: "Concert", detail: "Seoul\nEncore" },
      { year: 2024, title: "First award", detail: null },
      { year: 2024, title: "Second award", detail: null },
      { year: 2023, title: "Debut", detail: null },
    ] });
  });

  it("moves history entries only within their year and saves the new order", () => {
    const onSave = vi.fn();
    const concert = { year: 2025, title: "Concert", detail: null };
    const firstAward = { year: 2024, title: "First award", detail: null };
    const secondAward = { year: 2024, title: "Second award", detail: null };
    const thirdAward = { year: 2024, title: "Third award", detail: null };
    const debut = { year: 2023, title: "Debut", detail: null };
    renderWithI18n(
      <WikiBlockForm
        block={{
          blockIdentifier: "history-1",
          blockType: "history",
          displayOrder: 10,
          entries: [concert, firstAward, secondAward, thirdAward, debut],
        }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    const row = (position: number) => within(screen.getByRole("group", { name: `Item ${position}` }));
    expect(row(1).queryByRole("button", { name: "Move item down" })).toBeNull();
    expect(row(2).getByRole("button", { name: "Move item up" })).toBeDisabled();
    expect(row(4).getByRole("button", { name: "Move item down" })).toBeDisabled();

    fireEvent.change(row(2).getByLabelText("Details"), { target: { value: "Seoul" } });
    fireEvent.click(row(2).getByRole("button", { name: "Move item down" }));
    expect(row(3).getByLabelText("Event")).toHaveValue(firstAward.title);
    fireEvent.click(row(4).getByRole("button", { name: "Move item up" }));
    expect(row(3).getByLabelText("Event")).toHaveValue(thirdAward.title);
    expect(row(4).getByLabelText("Details")).toHaveValue("Seoul");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      entries: [concert, secondAward, thirdAward, { ...firstAward, detail: "Seoul" }, debut],
    });
  });

  it("submits text block content", () => {
    const onSave = vi.fn();

    renderWithI18n(<WikiBlockForm block={wikiStoryTextBlock} onCancel={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(onSave).toHaveBeenCalledWith({
      content:
        "The group balances brisk digital singles with a smaller number of concept-heavy mini albums.",
    });
  });

  it("submits structured table cell edits", () => {
    const onSave = vi.fn();

    renderWithI18n(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

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

    renderWithI18n(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

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

    renderWithI18n(<WikiBlockForm block={wikiStoryTableBlock} onCancel={() => {}} onSave={onSave} />);

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

    renderWithI18n(<WikiBlockForm block={block} onCancel={() => {}} onSave={onSave} />);

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

    renderWithI18n(<WikiBlockForm block={block} onCancel={() => {}} onSave={onSave} />);

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
    renderWithI18n(<WikiBlockForm block={wikiStoryTextBlock} onCancel={() => {}} onSave={() => {}} />);

    expect(screen.queryByLabelText("Link destination")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));

    expect(screen.getByRole("dialog")).toHaveClass("left-0");
    expect(screen.getByLabelText("Link destination")).toBeInTheDocument();
  });

  it("opens the link editor from a list item toolbar", () => {
    renderWithI18n(
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
    renderWithI18n(
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

    renderWithI18n(
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

    renderWithI18n(
      <WikiBlockForm
        block={wikiStoryProfileListBlock}
        onCancel={() => {}}
        onSave={onSave}
        sourceWiki={{ language: "ja", resourceType: "group", slug: "gr-twice" }}
      />,
    );

    const resourceTypeSelect = screen.getByLabelText("Resource type") as HTMLSelectElement;

    expect(within(resourceTypeSelect).getByRole("option", { name: "Talent" })).toHaveValue("talent");
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

    const cardShape = screen.getByLabelText("Card shape");
    expect(cardShape).toHaveValue("portrait");
    fireEvent.change(cardShape, { target: { value: "landscape" } });
    expect(screen.getByRole("img", { name: "SANA profile" }).parentElement).toHaveClass("aspect-video");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          cardShape: "landscape",
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

    renderWithI18n(
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

    expect(await screen.findByText("No related profiles.")).toBeInTheDocument();
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
      <I18nProvider initialLocale="ja">
        <WikiBlockForm
          block={block}
          onCancel={() => {}}
          onSave={onSave}
          sourceWiki={{ language: "ja", resourceType: "group", slug: "gr-twice" }}
        />
      </I18nProvider>,
    );

    const resourceTypeSelect = screen.getByLabelText("リソース種別");
    const agencyOption = within(resourceTypeSelect).getByRole<HTMLOptionElement>("option", { name: "事務所" });
    expect(agencyOption).toHaveValue("agency");
    expect(within(resourceTypeSelect).getByRole("option", { name: "楽曲" })).toHaveValue("song");
    expect(within(resourceTypeSelect).getByRole("option", { name: "タレント" })).toHaveValue("talent");

    fireEvent.change(resourceTypeSelect, { target: { value: agencyOption.value } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

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

    renderWithI18n(
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

    expect(await screen.findByText("Failed to load related profiles")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        profiles: [],
        wikiIdentifiers: [],
      }),
    );
  });
});
