import {
  wikiAgencyStatuses,
  wikiBloodTypes,
  wikiEnglishLevels,
  wikiGenerations,
  wikiGroupStatuses,
  wikiGroupTypes,
  wikiMbtiTypes,
  wikiSongGenres,
  wikiSongTypes,
  wikiZodiacSigns,
} from "@kpool/wiki";
import { describe, expect, it } from "vitest";

import { dictionaries } from "./dictionaries";
import { resolveLocale, resolveWikiListLocale } from "./locales";

describe("resolveLocale", () => {
  it("prefers saved locale over identity language and country", () => {
    expect(
      resolveLocale({
        identityLanguage: "ko",
        savedLocale: "ja",
        country: "US",
      }),
    ).toBe("ja");
  });

  it("uses saved locale before country for guests", () => {
    expect(resolveLocale({ savedLocale: "ja", country: "KR" })).toBe("ja");
  });

  it("prefers identity language over country when the saved locale is unavailable", () => {
    expect(resolveLocale({ identityLanguage: "ko", country: "JP" })).toBe("ko");
  });

  it("maps app country headers to guest locale", () => {
    expect(resolveLocale({ country: "JP" })).toBe("ja");
    expect(resolveLocale({ country: "jp" })).toBe("ja");
    expect(resolveLocale({ country: "KR" })).toBe("ko");
  });

  it("falls back to English for unsupported or unknown values", () => {
    expect(
      resolveLocale({
        identityLanguage: "fr",
        savedLocale: "zh",
        country: "US",
      }),
    ).toBe("en");
    expect(resolveLocale({ country: "JPN" })).toBe("en");
  });
});

describe("resolveWikiListLocale", () => {
  it("uses the same priority as the root layout locale resolver", () => {
    expect(
      resolveWikiListLocale({
        identityLanguage: "ko",
        savedLocale: "ja",
        country: "KR",
      }),
    ).toBe("ja");
    expect(resolveWikiListLocale({ identityLanguage: "ko", country: "JP" })).toBe(
      "ko",
    );
    expect(resolveWikiListLocale({ country: "JP" })).toBe("ja");
    expect(resolveWikiListLocale({ country: "US" })).toBe("en");
  });
});


describe("wiki enum labels", () => {
  it("has localized labels for every Wiki Basic enum raw value", () => {
    const requiredEntries = {
      agencyStatus: wikiAgencyStatuses,
      groupType: wikiGroupTypes,
      groupStatus: wikiGroupStatuses,
      generation: wikiGenerations,
      songType: wikiSongTypes,
      songGenre: wikiSongGenres,
      mbti: wikiMbtiTypes,
      zodiacSign: wikiZodiacSigns,
      englishLevel: wikiEnglishLevels,
      bloodType: wikiBloodTypes,
    } as const;

    Object.values(dictionaries).forEach((dictionary) => {
      Object.entries(requiredEntries).forEach(([labelGroup, rawValues]) => {
        const labels = dictionary.wiki.enumLabels[labelGroup as keyof typeof requiredEntries];

        rawValues.forEach((rawValue) => {
          expect(labels[rawValue as keyof typeof labels]).toBeTruthy();
        });
      });
    });
  });
});
