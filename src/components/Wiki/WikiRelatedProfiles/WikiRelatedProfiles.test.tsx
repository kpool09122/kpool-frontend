import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WikiProfileCardListBlock } from "@kpool/wiki";

import { WikiRelatedProfiles } from ".";

describe("WikiRelatedProfiles", () => {
  it("renders saved related profile summaries without resolving mock detail data", () => {
    const block: WikiProfileCardListBlock = {
      blockIdentifier: "related-profiles",
      blockType: "profile_card_list",
      displayOrder: 1,
      profiles: [
        {
          wikiIdentifier: "momo-wiki",
          slug: "tl-momo",
          language: "ko",
          resourceType: "talent",
          name: "MOMO",
          normalizedName: "momo",
          imageUrl: "https://example.test/momo.jpg",
          imageAltText: "MOMO top image",
        },
        {
          wikiIdentifier: "sana-wiki",
          slug: "tl-sana",
          language: "ko",
          resourceType: "talent",
          name: "SANA",
          normalizedName: "sana",
          imageUrl: null,
          imageAltText: null,
        },
      ],
      relatedResourceType: "talent",
      title: "Related profiles",
      wikiIdentifiers: [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ],
    };

    render(<WikiRelatedProfiles block={block} language="ko" />);

    expect(screen.getByRole("img", { name: "MOMO top image" })).toHaveAttribute(
      "src",
      "https://example.test/momo.jpg",
    );
    expect(screen.getByRole("link", { name: /MOMO/i })).toHaveAttribute(
      "href",
      "/wiki/ko/tl-momo",
    );
    expect(screen.getAllByText("SANA")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /SANA/i })).toHaveAttribute(
      "href",
      "/wiki/ko/tl-sana",
    );
    expect(screen.queryByText("Aurora Echo")).not.toBeInTheDocument();
  });

  it("does not fall back to mock details when only identifiers are present", () => {
    const block: WikiProfileCardListBlock = {
      blockIdentifier: "related-profiles",
      blockType: "profile_card_list",
      displayOrder: 1,
      relatedResourceType: "talent",
      title: "Related profiles",
      wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
    };

    render(<WikiRelatedProfiles block={block} language="ko" />);

    expect(screen.getByText("関連プロフィールはありません")).toBeInTheDocument();
    expect(screen.queryByText("Aurora Echo")).not.toBeInTheDocument();
  });
});
