import React from "react";
import { render, screen } from "@testing-library/react";
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
        type: "section",
        sectionIdentifier: "members",
        title: "Members",
        displayOrder: 20,
        depth: 1,
        contents: [
          {
            blockIdentifier: "members-text",
            blockType: "text",
            displayOrder: 10,
            content: "Members body",
          },
          {
            blockIdentifier: "members-profiles",
            blockType: "profile_card_list",
            displayOrder: 20,
            wikiIdentifiers: ["aurora-echo"],
            title: "Related profiles",
          },
        ],
        children: [],
      },
      {
        type: "section",
        sectionIdentifier: "overview",
        title: "Overview",
        displayOrder: 10,
        depth: 1,
        contents: [
          {
            blockIdentifier: "overview-text",
            blockType: "text",
            displayOrder: 10,
            content: "Overview body",
          },
          {
            blockIdentifier: "overview-embed",
            blockType: "embed",
            displayOrder: 20,
            provider: "youtube",
            embedId: "abc123",
            caption: "Overview video",
          },
        ],
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
    expect(screen.getByText("Overview body")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube embed: Overview video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abc123",
    );
    expect(screen.getByRole("link", { name: /Aurora Echo/i })).toHaveAttribute(
      "href",
      "/wiki/aurora-echo",
    );
    expect(screen.getAllByLabelText(/Edit section/i)).toHaveLength(2);
    expect(screen.queryByTestId("wiki-theme-badge")).not.toBeInTheDocument();
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
