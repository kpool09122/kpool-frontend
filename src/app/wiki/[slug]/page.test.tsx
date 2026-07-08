import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WikiDetailPage } from "./WikiDetailPage";
import type { WikiDetailState } from "@kpool/wiki";

const successState: WikiDetailState = {
  status: "success",
  data: {
    wikiIdentifier: "aurora-echo",
    slug: "gr-aurora-echo",
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
        talents: [
          {
            wikiIdentifier: "talent-wiki-1",
            slug: "tl-momo",
            language: "ko",
            name: "MOMO",
            normalizedName: "momo",
          },
          {
            wikiIdentifier: "talent-wiki-2",
            slug: "tl-sana",
            language: "ko",
            name: "SANA",
            normalizedName: "sana",
          },
        ],
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
            profiles: [
              {
                wikiIdentifier: "related-wiki-1",
                slug: "gr-aurora-echo",
                language: "ja",
                resourceType: "group",
                name: "Aurora Echo",
                normalizedName: "aurora-echo",
                imageUrl: null,
                imageAltText: null,
              },
            ],
            wikiIdentifiers: ["33333333-3333-3333-3333-333333333333"],
            title: "Related profiles",
          },
        ],
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
      },
    ],
  },
};

describe("WikiDetailPage", () => {
  afterEach(() => cleanup());

  it("renders the public wiki detail view", () => {
    render(
      React.createElement(WikiDetailPage, {
        language: "ja",
        slug: "gr-aurora-echo",
        wikiState: successState,
      }),
    );

    expect(screen.getAllByRole("heading", { name: "Aurora Echo" })[0]).toBeInTheDocument();
    expect(screen.getAllByText("Aurora Echo")[0]).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getAllByText("Talents").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "MOMO" })[0]).toHaveAttribute(
      "href",
      "/ko/wiki/tl-momo",
    );
    expect(screen.getAllByRole("link", { name: "SANA" })[0]).toHaveAttribute(
      "href",
      "/ko/wiki/tl-sana",
    );
    fireEvent.click(screen.getByTestId("section-toggle-overview"));
    expect(screen.getByText("Overview body")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube embed: Overview video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abc123",
    );
    fireEvent.click(screen.getByTestId("section-toggle-members"));
    expect(screen.getByRole("link", { name: /Aurora Echo/i })).toHaveAttribute(
      "href",
      "/ja/wiki/gr-aurora-echo",
    );
    expect(screen.getAllByRole("link", { name: "Edit basic" })[0]).toHaveAttribute(
      "href",
      "/ja/wiki/gr-aurora-echo/edit",
    );
    const sectionEditLinks = screen.getAllByRole("link", { name: /Edit section/i });
    expect(sectionEditLinks).toHaveLength(2);
    expect(sectionEditLinks[0]).toHaveAttribute(
      "href",
      "/ja/wiki/gr-aurora-echo/edit",
    );
    expect(screen.queryByTestId("wiki-theme-badge")).not.toBeInTheDocument();
  });

  it("injects theme css variables without rendering the color code when themeColor is provided", () => {
    const { container } = render(
      React.createElement(WikiDetailPage, {
        language: "ja",
        slug: "gr-aurora-echo",
        wikiState: {
          ...successState,
          data: {
            ...successState.data,
            themeColor: "#d94f70",
          },
        },
      }),
    );

    expect(screen.queryByTestId("wiki-theme-badge")).not.toBeInTheDocument();
    const rootStyle = container
      .querySelector('[data-testid="wiki-theme-root"]')
      ?.getAttribute("style");

    expect(rootStyle).toContain("--wiki-page-background-light:");
    expect(rootStyle).toContain("--wiki-header-background-dark:");
  });

  it("renders the empty state", () => {
    render(
      React.createElement(WikiDetailPage, {
        language: "ja",
        slug: "empty",
        wikiState: { status: "empty" },
      }),
    );

    expect(screen.getByText("No public wiki yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This resource does not have a public wiki detail page at the moment.",
      ),
    ).toBeInTheDocument();
  });
});
