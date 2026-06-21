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

describe("wikiApiModel section identifiers", () => {
  it("generates unique fallback identifiers for nested sections without backend ids", () => {
    const wiki = adaptDraftWikiApiResponse({
      ...baseApiResponse,
      status: "editing",
      sections: [
        {
          type: "section",
          title: "Overview",
          contents: [
            {
              type: "section",
              title: "Nested one",
              contents: [
                {
                  type: "section",
                  title: "Deep nested",
                  contents: [],
                },
              ],
            },
          ],
        },
        {
          type: "section",
          title: "Another root",
          contents: [
            {
              type: "section",
              title: "Nested two",
              contents: [],
            },
          ],
        },
      ],
    });

    const firstRoot = wiki.sections[0];
    const firstNested = firstRoot?.children[0];
    const deepNested = firstNested?.children[0];
    const secondRoot = wiki.sections[1];
    const secondNested = secondRoot?.children[0];

    expect(firstRoot?.sectionIdentifier).toBe("section-1");
    expect(firstNested?.sectionIdentifier).toBe("section-1-1");
    expect(deepNested?.sectionIdentifier).toBe("section-1-1-1");
    expect(secondRoot?.sectionIdentifier).toBe("section-2");
    expect(secondNested?.sectionIdentifier).toBe("section-2-1");
  });
});
