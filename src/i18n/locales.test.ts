import { describe, expect, it } from "vitest";

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
