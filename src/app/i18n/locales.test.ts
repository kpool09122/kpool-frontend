import { describe, expect, it } from "vitest";

import { resolveLocale } from "./locales";

describe("resolveLocale", () => {
  it("prefers identity language over saved locale and country", () => {
    expect(
      resolveLocale({
        identityLanguage: "ko",
        savedLocale: "ja",
        country: "US",
      }),
    ).toBe("ko");
  });

  it("uses saved locale before country for guests", () => {
    expect(resolveLocale({ savedLocale: "ja", country: "KR" })).toBe("ja");
  });

  it("maps country headers to guest locale", () => {
    expect(resolveLocale({ country: "JP" })).toBe("ja");
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
  });
});
