import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WikiDetailPage } from "./WikiDetailPage";
import { useWikiDetail, type WikiDetailState } from "./useWikiDetail";

vi.mock("./useWikiDetail", () => ({
  useWikiDetail: vi.fn(),
}));

const mockedUseWikiDetail = vi.mocked(useWikiDetail);

const successState: WikiDetailState = {
  status: "success",
  data: {
    wikiIdentifier: "aurora-echo",
    slug: "aurora-echo",
    language: "ja",
    resourceType: "group",
    version: 3,
    themeColor: null,
    heroImage: {
      src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%233560a3'/%3E%3C/svg%3E",
      alt: "Aurora Echo hero image",
    },
    summary: "Aurora Echo summary",
    basic: {
      name: "Aurora Echo",
      normalizedName: "aurora-echo",
      resourceType: "group",
      groupType: "Girl Group",
      status: "Active",
      generation: "5th",
      debutDate: "2022-03-14",
      fandomName: "Daybreak",
      emoji: "🌅",
      representativeSymbol: "Solar wave",
      officialColors: ["Solar Gold", "Midnight Blue"],
      agencyName: "North Harbor Entertainment",
    },
    sections: [
      {
        sectionIdentifier: "members",
        title: "Members",
        displayOrder: 20,
        depth: 1,
        body: "Members body",
        children: [],
      },
      {
        sectionIdentifier: "overview",
        title: "Overview",
        displayOrder: 10,
        depth: 1,
        body: "Overview body",
        children: [],
      },
    ],
  },
};

describe("WikiDetailPage", () => {
  beforeEach(() => {
    mockedUseWikiDetail.mockReset();
  });

  it("renders the public wiki detail view", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiDetailPage, { slug: "aurora-echo" }));

    expect(screen.getAllByRole("heading", { name: "Aurora Echo" })[0]).toBeInTheDocument();
    expect(screen.getAllByText("Aurora Echo")[0]).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Edit section/i)).toHaveLength(2);
    expect(screen.queryByTestId("wiki-theme-badge")).not.toBeInTheDocument();
  });

  it("renders sections as closed accordions by default", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiDetailPage, { slug: "aurora-echo" }));

    const [section] = screen.getAllByTestId("section-overview");

    expect(section).not.toHaveAttribute("open");
  });

  it("toggles the mobile flip card control", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiDetailPage, { slug: "aurora-echo" }));

    const [flipInput] = screen.getAllByTestId("wiki-flip-input");
    const [flipButton] = screen.getAllByTestId("wiki-flip-front-toggle");

    fireEvent.click(flipButton);

    expect(flipInput).toBeChecked();
    expect(
      screen.getAllByText("Tap the card again to return to the cover image.")[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText("Group profile")[0]).toBeInTheDocument();
  });

  it("injects theme css variables and badges when themeColor is provided", () => {
    mockedUseWikiDetail.mockReturnValue({
      ...successState,
      data: {
        ...successState.data,
        themeColor: "#d94f70",
      },
    });

    const { container } = render(
      React.createElement(WikiDetailPage, { slug: "aurora-echo" }),
    );

    expect(screen.getByTestId("wiki-theme-badge")).toHaveTextContent(
      "Theme #D94F70",
    );
    const rootStyle = container
      .querySelector('[data-testid="wiki-theme-root"]')
      ?.getAttribute("style");

    expect(rootStyle).toContain("--wiki-page-background-light:");
    expect(rootStyle).toContain("--wiki-header-background-dark:");
  });

  it("renders the empty state", () => {
    mockedUseWikiDetail.mockReturnValue({ status: "empty" });

    render(React.createElement(WikiDetailPage, { slug: "empty" }));

    expect(screen.getByText("No public wiki yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This resource does not have a public wiki detail page at the moment.",
      ),
    ).toBeInTheDocument();
  });
});
