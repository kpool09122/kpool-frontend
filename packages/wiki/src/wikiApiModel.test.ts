import { describe, expect, it } from "vitest";

import { adaptDraftWikiApiResponse, adaptWikiApiResponse } from "./wikiApiModel";

const baseApiResponse = {
  basic: {
    name: "Aurora Echo",
    normalizedName: "aurora-echo",
  },
  heroImage: {
    alt: "Aurora Echo image",
    src: "https://cdn.example.com/aurora-echo.webp",
  },
  language: "ja",
  resourceType: "group",
  sections: [],
  slug: "gr-aurora-echo",
  themeColor: "#4c5cff",
  translationSetIdentifier: "translation-set-aurora-echo",
  wikiIdentifier: "wiki-1",
};

describe("wikiApiModel SEO metadata", () => {
  it("adapts public wiki SEO metadata", () => {
    expect(
      adaptWikiApiResponse({
        ...baseApiResponse,
        version: 4,
        title: "Aurora Echo SEO",
        metaDescription: "Aurora Echo profile and discography.",
        keywords: ["aurora", "echo"],
      }),
    ).toMatchObject({
      title: "Aurora Echo SEO",
      metaDescription: "Aurora Echo profile and discography.",
      keywords: ["aurora", "echo"],
    });
  });

  it("adapts draft wiki SEO metadata and falls back to null when omitted", () => {
    expect(
      adaptDraftWikiApiResponse({
        ...baseApiResponse,
        status: "pending",
      }),
    ).toMatchObject({
      title: null,
      metaDescription: null,
      keywords: null,
    });

    expect(
      adaptDraftWikiApiResponse({
        ...baseApiResponse,
        status: "pending",
        title: "Draft SEO",
        meta_description: "Draft meta description.",
        keywords: ["draft", "seo"],
      }),
    ).toMatchObject({
      title: "Draft SEO",
      metaDescription: "Draft meta description.",
      keywords: ["draft", "seo"],
    });
  });
});
