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
    expect(screen.getAllByRole("button", { name: "Save wiki changes" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Clear wiki changes" })).toBeInTheDocument();
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

  it("flips the mobile edit card to reveal basic details", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    const [flipInput] = screen.getAllByTestId("wiki-edit-flip-input");
    const [flipButton] = screen.getAllByTestId("wiki-edit-flip-front-toggle");
    const [flipCard] = screen.getAllByTestId("wiki-edit-flip-card");

    fireEvent.click(flipButton);

    expect(flipInput).toBeChecked();
    expect(flipCard).toHaveClass("[transform:rotateY(180deg)]");
    expect(screen.getAllByText("North Harbor Entertainment")[0]).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("North Harbor Entertainment")[0]);

    expect(flipInput).not.toBeChecked();
    expect(flipCard).not.toHaveClass("[transform:rotateY(180deg)]");
  });

  it("adds a block inside a section and opens the new block editor", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
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

  it("edits related profile blocks by wiki slug", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    const profileBlock = screen.getByTestId("wiki-edit-block-block-discography-profiles");
    fireEvent.click(
      within(profileBlock).getByRole("button", {
        name: "Edit profile_card_list block",
      }),
    );

    expect(screen.getByLabelText("Wiki slugs")).toHaveValue("aurora-echo");
  });

  it("shows max depth instead of child section creation at depth 3", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiEditPage, { slug: "aurora-echo" }));

    expect(
      screen.getByTestId("wiki-edit-add-section-sec-discography-highlights-chart"),
    ).toHaveTextContent("Max depth reached");
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
