import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";

import { useWikiDetail, type WikiDetailState } from "../useWikiDetail";
import { WikiEditPage } from "./WikiEditPage";

vi.mock("../useWikiDetail", () => ({
  useWikiDetail: vi.fn(),
}));

const mockedUseWikiDetail = vi.mocked(useWikiDetail);

const successState: WikiDetailState = {
  status: "success",
  data: createMockWikiDetail("aurora-echo"),
};

describe("WikiEditPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockedUseWikiDetail.mockReset();
  });

  it("renders the editable wiki layout with image overlays and save state", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    expect(screen.getByRole("heading", { name: "Aurora Echo" })).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear wiki changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "gui" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "code" })).toHaveAttribute("aria-pressed", "false");
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
      "/wiki/aurora-echo",
    );
  });

  it("adds a block inside a section and opens the new block editor", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
  });

  it("shows the formatting toolbar only while editing a text block", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

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
    mockedUseWikiDetail.mockReturnValue(successState);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

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
    mockedUseWikiDetail.mockReturnValue(successState);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");

    confirmSpy.mockRestore();
  });

  it("switches to code mode and reflects valid edits back into gui mode", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

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
    mockedUseWikiDetail.mockReturnValue(successState);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

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

  it("shows compatibility warnings for namuwiki syntax that falls back to text blocks", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

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

    expect(document.querySelector('a[href="/wiki/%EB%AC%B8%EC%84%9C"]')).not.toBeNull();
    expect(screen.getByLabelText("Footnote: 주석 예시")).toBeInTheDocument();
    expect(screen.getByText("Included from 틀:Discography")).toBeInTheDocument();
  });

  it("shows compatibility warnings immediately for the dedicated namuwiki demo mock", () => {
    mockedUseWikiDetail.mockReturnValue({
      status: "success",
      data: createMockWikiDetail("twice"),
    });

    render(React.createElement(WikiEditPage, { slug: "twice" }));

    fireEvent.click(screen.getByRole("button", { name: "code" }));

    expect(screen.queryByTestId("wiki-code-warnings")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "gui" }));
    expect(document.querySelector('a[href="/wiki/nayeon-twice"]')).not.toBeNull();
    expect(screen.getByText("TWICE Members")).toBeInTheDocument();
  });

  it("maps supported media include macros into embed blocks in gui mode", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

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

  it("renders loading, error, and empty states", () => {
    mockedUseWikiDetail.mockReturnValue({ status: "loading" });
    const { rerender } = render(
      React.createElement(WikiEditPage, { slug: "loading" }),
    );

    expect(screen.getByText("Loading Wiki Editor")).toBeInTheDocument();

    mockedUseWikiDetail.mockReturnValue({ status: "error", message: "Broken" });
    rerender(React.createElement(WikiEditPage, { slug: "error" }));
    expect(screen.getByText("Broken")).toBeInTheDocument();

    mockedUseWikiDetail.mockReturnValue({ status: "empty" });
    rerender(React.createElement(WikiEditPage, { slug: "empty" }));
    expect(screen.getByText("No wiki draft")).toBeInTheDocument();
  });
});
