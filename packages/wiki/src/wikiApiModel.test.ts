import { describe, expect, it } from "vitest";

import { adaptDraftWikiApiResponse, adaptWikiApiResponse } from "./wikiApiModel";
import { isWikiSection } from "./wikiEditModel";

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
  fontStyle: "ja_gothic",
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
      fontStyle: "ja_gothic",
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
      fontStyle: "ja_gothic",
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
    const firstNested = firstRoot?.contents.find(isWikiSection);
    const deepNested = firstNested?.contents.find(isWikiSection);
    const secondRoot = wiki.sections[1];
    const secondNested = secondRoot?.contents.find(isWikiSection);

    expect(firstRoot?.sectionIdentifier).toBe("section-1");
    expect(firstNested?.sectionIdentifier).toBe("section-1-1");
    expect(deepNested?.sectionIdentifier).toBe("section-1-1-1");
    expect(secondRoot?.sectionIdentifier).toBe("section-2");
    expect(secondNested?.sectionIdentifier).toBe("section-2-1");
  });
});

describe("wikiApiModel profile card list blocks", () => {
  it("keeps expanded related profile summaries from the API response", () => {
    const wiki = adaptWikiApiResponse({
      ...baseApiResponse,
      version: 4,
      sections: [
        {
          id: "members",
          title: "Members",
          contents: [
            {
              type: "profile_card_list",
              id: "members-profiles",
              display_order: 20,
              related_resource_type: "talent",
              title: "Related profiles",
              wiki_identifiers: ["11111111-1111-1111-1111-111111111111"],
              profiles: [
                {
                  wiki_identifier: "11111111-1111-1111-1111-111111111111",
                  slug: "tl-momo",
                  language: "ko",
                  resource_type: "talent",
                  name: "MOMO",
                  normalized_name: "momo",
                  image_identifier: "99999999-9999-9999-9999-999999999999",
                  image_url: "https://upload.wikimedia.org/wikipedia/commons/example/momo.webp",
                  image_alt_text: "MOMO profile image",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(wiki.sections[0]?.contents[0]).toMatchObject({
      blockIdentifier: "members-profiles",
      blockType: "profile_card_list",
      displayOrder: 20,
      relatedResourceType: "talent",
      title: "Related profiles",
      wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
      profiles: [
        {
          wikiIdentifier: "11111111-1111-1111-1111-111111111111",
          slug: "tl-momo",
          language: "ko",
          resourceType: "talent",
          name: "MOMO",
          normalizedName: "momo",
          imageIdentifier: "99999999-9999-9999-9999-999999999999",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/example/momo.webp",
          imageAltText: "MOMO profile image",
        },
      ],
    });
  });

  it("does not synthesize profile summaries when the API only returns identifiers", () => {
    const wiki = adaptWikiApiResponse({
      ...baseApiResponse,
      version: 4,
      sections: [
        {
          id: "members",
          title: "Members",
          contents: [
            {
              type: "profile_card_list",
              id: "members-profiles",
              relatedResourceType: "talent",
              wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
            },
          ],
        },
      ],
    });

    expect(wiki.sections[0]?.contents[0]).toMatchObject({
      blockType: "profile_card_list",
      profiles: [],
      wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
    });
  });
});
