import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n/I18nProvider";

import { WikiDetailPage } from "./WikiDetailPage";
import { createMockWikiDetail, type WikiDetail, type WikiDetailState } from "@kpool/wiki";

const successWikiDetail: WikiDetail = {
  ...createMockWikiDetail("gr-aurora-echo"),
  basic: {
    ...createMockWikiDetail("gr-aurora-echo").basic,
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
};

const successState: WikiDetailState = {
  status: "success",
  data: successWikiDetail,
};

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

describe("WikiDetailPage", () => {
  afterEach(() => cleanup());

  it("renders the public wiki detail view", () => {
    renderWithI18n(
      React.createElement(WikiDetailPage, {
        language: "ja",
        slug: "gr-aurora-echo",
        wikiState: successState,
      }),
    );

    expect(screen.getAllByRole("heading", { name: "Aurora Echo" })[0]).toBeInTheDocument();
    expect(screen.getAllByText("Aurora Echo")[0]).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Wiki content tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wiki" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getAllByText("タレント").length).toBeGreaterThan(0);
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
    expect(screen.queryByRole("img", { name: "公式認証済みWiki" })).not.toBeInTheDocument();
  });

  it("renders the official certification badge beside an official wiki name", () => {
    renderWithI18n(
      React.createElement(WikiDetailPage, {
        language: "ja",
        slug: "gr-aurora-echo",
        wikiState: {
          ...successState,
          data: {
            ...successState.data,
            isOfficial: true,
          },
        },
      }),
    );

    expect(screen.getByRole("img", { name: "公式認証済みWiki" })).toBeInTheDocument();
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
            fontStyle: "ko_myungjo",
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
    expect(rootStyle).toContain("AppleMyungjo");
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
