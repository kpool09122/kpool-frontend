import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";
import { WikiDiffPage } from "./WikiDiffPage";

describe("WikiDiffPage", () => {
  it("renders the public wiki on the left and the draft wiki on the right", () => {
    const basePublicWiki = createMockWikiDetail("gr-aurora-echo");
    const baseDraftWiki = createMockWikiDetail("gr-aurora-echo");
    const publicWiki = {
      ...basePublicWiki,
      basic: {
        ...basePublicWiki.basic,
        name: "公開中 Wiki",
      },
      themeColor: "#4c5cff",
      fontStyle: "ja_mincho",
    };
    const draftWiki = {
      ...baseDraftWiki,
      basic: {
        ...baseDraftWiki.basic,
        name: "下書き Wiki",
      },
      themeColor: "#d94f70",
      fontStyle: "en_serif",
    };

    render(
      React.createElement(WikiDiffPage, {
        language: "ja",
        publicWikiState: {
          status: "success",
          data: publicWiki,
        },
        draftWikiState: {
          status: "success",
          data: draftWiki,
        },
      }),
    );

    const publicRegion = screen.getByRole("region", { name: "before" });
    const draftRegion = screen.getByRole("region", { name: "after" });
    const regions = screen.getAllByRole("region");

    expect(screen.queryByRole("heading", { name: "Wiki差分" })).not.toBeInTheDocument();
    expect(regions.indexOf(publicRegion)).toBeLessThan(regions.indexOf(draftRegion));
    expect(
      within(publicRegion).getByRole("heading", { name: "公開中 Wiki", level: 1 }),
    ).toBeInTheDocument();
    expect(
      within(draftRegion).getByRole("heading", { name: "下書き Wiki", level: 1 }),
    ).toBeInTheDocument();

    const publicThemeStyle = screen
      .getByTestId("wiki-diff-public-theme-root")
      .getAttribute("style");
    const draftThemeStyle = screen
      .getByTestId("wiki-diff-draft-theme-root")
      .getAttribute("style");

    expect(publicThemeStyle).toContain("--wiki-page-background-light:");
    expect(draftThemeStyle).toContain("--wiki-page-background-light:");
    expect(publicThemeStyle).toContain("Yu Mincho");
    expect(draftThemeStyle).toContain("Georgia");
    expect(publicThemeStyle).not.toBe(draftThemeStyle);
  });
});
