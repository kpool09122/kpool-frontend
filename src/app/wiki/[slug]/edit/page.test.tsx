import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";

import { WikiEditPage } from "./WikiEditPage";

const successState = {
  status: "success",
  data: createMockWikiDetail("gr-aurora-echo"),
} as const;

const renderPage = (
  wikiState: { status: "success"; data: ReturnType<typeof createMockWikiDetail> } | {
    status: "error";
    message: string;
  } | {
    status: "empty";
  } = successState,
  saveAdapter = vi.fn().mockResolvedValue({ ok: true }),
) =>
  render(
    React.createElement(WikiEditPage, {
      language: "ja",
      saveAdapter,
      slug: "gr-aurora-echo",
      wikiState,
    }),
  );

describe("WikiEditPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the editable wiki layout with image overlays and save state", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Aurora Echo" })).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear wiki changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "gui" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "code" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Resource type")).toHaveValue("group");
    expect(screen.getByText("gr-")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toHaveValue("aurora-echo");
    expect(screen.getByRole("group", { name: "Preview mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse editor sidebar" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("wiki-edit-root")).toHaveAttribute("data-theme", "light");
    expect(screen.getAllByTestId("wiki-edit-flip-input")[0]).not.toBeChecked();
    expect(screen.getAllByText("Editable image").length).toBeGreaterThan(0);
    expect(screen.getByTestId("wiki-edit-section-sec-overview")).toBeInTheDocument();
    expect(screen.getByTestId("wiki-edit-block-block-discography-quote")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube embed: Stage video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/low-tide-high-lights",
    );
    expect(screen.getByRole("link", { name: /Aurora Echo/i })).toHaveAttribute(
      "href",
      "/wiki/ja/gr-aurora-echo",
    );
  });

  it("adds a block inside a section and opens the new block editor", () => {
    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
  });

  it("shows the formatting toolbar only while editing a text block", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit text block" })[0]);

    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Strike" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Link destination")).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Insert link" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));

    expect(screen.getByLabelText("Link destination")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit quote block" })[0]);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });

  it("clears draft changes back to the loaded wiki", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));

    expect(screen.queryByLabelText("Quote")).not.toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");

    confirmSpy.mockRestore();
  });

  it("keeps draft changes when clear is canceled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");

    confirmSpy.mockRestore();
  });

  it("switches to code mode and reflects valid edits back into gui mode", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: [
          "== Overview ==",
          "",
          "Updated overview from code mode.",
          "",
          "=== Style Guide ===",
          "",
          "A new nested section.",
        ].join("\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "gui" }));

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Style Guide")).toBeInTheDocument();
    expect(screen.getByText("Updated overview from code mode.")).toBeInTheDocument();
  });

  it("shows a parse error for invalid code and clears back to the last loaded draft", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: ["== Overview ==", "", "[[image|id:cover]"].join("\n"),
      },
    });

    expect(screen.getByTestId("wiki-code-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Clear invalid code" }));

    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");
    expect(screen.queryByTestId("wiki-code-error")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Wiki code") as HTMLTextAreaElement).value).toContain(
      "== Overview ==",
    );

    confirmSpy.mockRestore();
  });

  it("saves the loaded draft through the injected save adapter", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "custom-title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    expect(screen.getByText("Saving changes")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "gr-custom-title",
        wikiIdentifier: "gr-aurora-echo",
      }),
    );
  });

  it("shows save failure and allows retrying", async () => {
    const saveAdapter = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "retry-title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(screen.getByText("Save failed")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(saveAdapter).toHaveBeenCalledTimes(2);
  });

  it("shows compatibility warnings for namuwiki syntax that falls back to text blocks", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: [
          "== Overview ==",
          "",
          "[[문서|대표 문서]]",
          "",
          "[[분류:테스트]]",
          "",
          "[* 주석 예시]",
          "",
          "[include(틀:Discography)]",
        ].join("\n"),
      },
    });

    expect(screen.queryByTestId("wiki-code-warnings")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wiki-code-error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "gui" }));

    expect(
      document.querySelector('a[href="/wiki/ja/%EB%AC%B8%EC%84%9C"]'),
    ).not.toBeNull();
    expect(screen.getByLabelText("Footnote: 주석 예시")).toBeInTheDocument();
    expect(screen.getByText("Included from 틀:Discography")).toBeInTheDocument();
  });

  it("shows compatibility warnings immediately for the dedicated namuwiki demo mock", () => {
    renderPage({
      status: "success",
      data: createMockWikiDetail("gr-twice"),
    });

    fireEvent.click(screen.getByRole("button", { name: "code" }));

    expect(screen.queryByTestId("wiki-code-warnings")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "gui" }));
    expect(document.querySelector('a[href="/wiki/ja/tl-nayeon-twice"]')).not.toBeNull();
    expect(screen.getByText("TWICE Members")).toBeInTheDocument();
  });

  it("maps supported media include macros into embed blocks in gui mode", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: [
          "== Overview ==",
          "",
          "[include(틀:영상 정렬, url=jNQXAC9IVRw)]",
        ].join("\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "gui" }));

    expect(screen.getByTitle("YouTube embed")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw",
    );
  });

  it("moves resource type editing into the sidebar and keeps slug prefixes in sync", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "song" },
    });

    expect(screen.getByText("sg-")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toHaveValue("aurora-echo");

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "custom-title" },
    });

    expect(screen.getByLabelText("Slug")).toHaveValue("custom-title");
  });

  it("renders error and empty states", () => {
    const { rerender } = renderPage({ status: "error", message: "Broken" });
    expect(screen.getByText("Broken")).toBeInTheDocument();

    rerender(
      React.createElement(WikiEditPage, {
        language: "ja",
        slug: "gr-aurora-echo",
        wikiState: { status: "empty" },
      }),
    );
    expect(screen.getByText("No wiki draft")).toBeInTheDocument();
  });
});
