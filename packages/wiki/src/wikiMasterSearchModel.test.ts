import { describe, expect, it } from "vitest";

import {
  createTranslationSetMasterSearchUrl,
  selectTranslationSetMasterDisplayWiki,
} from "./wikiMasterSearchModel";

describe("translation set master search model", () => {
  it("builds translation set master search URLs without language", () => {
    expect(
      createTranslationSetMasterSearchUrl({
        baseUrl: "https://api.example.test/api/wiki/",
        keyword: "twice",
        limit: 20,
        resourceType: "agency",
      }),
    ).toBe("https://api.example.test/api/wiki/wiki-translation-sets/masters?resourceType=agency&keyword=twice&limit=20");
  });

  it("selects the UI locale wiki before falling back to another language", () => {
    const item = {
      translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
      resourceType: "agency",
      wikis: [
        {
          wikiIdentifier: "22222222-2222-4222-8222-222222222222",
          language: "ja",
          name: "日本語名",
          slug: "ja-name",
        },
        {
          wikiIdentifier: "33333333-3333-4333-8333-333333333333",
          language: "en",
          name: "English Name",
          slug: "en-name",
        },
      ],
    };

    expect(selectTranslationSetMasterDisplayWiki(item, "en")?.name).toBe("English Name");
    expect(selectTranslationSetMasterDisplayWiki(item, "ko")?.name).toBe("日本語名");
  });
});
