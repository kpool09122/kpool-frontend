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

    render(React.createElement(WikiDetailPage, { wikiId: "aurora-echo" }));

    expect(screen.getAllByRole("heading", { name: "Aurora Echo" })[0]).toBeInTheDocument();
    expect(screen.getAllByText("Aurora Echo")[0]).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Edit section/i)).toHaveLength(2);
  });

  it("renders sections as closed accordions by default", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiDetailPage, { wikiId: "aurora-echo" }));

    const [section] = screen.getAllByTestId("section-overview");

    expect(section).not.toHaveAttribute("open");
  });

  it("toggles the mobile flip card control", () => {
    mockedUseWikiDetail.mockReturnValue(successState);

    render(React.createElement(WikiDetailPage, { wikiId: "aurora-echo" }));

    const [flipInput] = screen.getAllByTestId("wiki-flip-input");
    const [flipButton] = screen.getAllByTestId("wiki-flip-front-toggle");

    fireEvent.click(flipButton);

    expect(flipInput).toBeChecked();
    expect(
      screen.getAllByText("Tap the card again to return to the cover image.")[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText("Group profile")[0]).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    mockedUseWikiDetail.mockReturnValue({ status: "empty" });

    render(React.createElement(WikiDetailPage, { wikiId: "empty" }));

    expect(screen.getByText("No public wiki yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This resource does not have a public wiki detail page at the moment.",
      ),
    ).toBeInTheDocument();
  });
});
