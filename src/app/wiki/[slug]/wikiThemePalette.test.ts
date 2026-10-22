import { describe, expect, it } from "vitest";

import {
  buildWikiThemeCssVariables,
  createWikiThemePalette,
  wikiThemeTestHelpers,
} from "./wikiThemePalette";

describe("wikiThemePalette", () => {
  it("returns no css variables when themeColor is missing or invalid", () => {
    expect(buildWikiThemeCssVariables(undefined)).toBeUndefined();
    expect(buildWikiThemeCssVariables("")).toBeUndefined();
    expect(buildWikiThemeCssVariables("not-a-color")).toBeUndefined();
  });

  it("normalizes shorthand and full hex colors", () => {
    expect(wikiThemeTestHelpers.normalizeHexColor("#abc")).toBe("#aabbcc");
    expect(wikiThemeTestHelpers.normalizeHexColor("D46A6A")).toBe("#d46a6a");
  });

  it("keeps readable contrast for light and dark palettes", () => {
    const lightPalette = createWikiThemePalette("#ff0055", "light");
    const darkPalette = createWikiThemePalette("#00ff66", "dark");

    expect(
      wikiThemeTestHelpers.getContrastRatio(
        lightPalette.headerBackground,
        lightPalette.headerText,
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      wikiThemeTestHelpers.getContrastRatio(
        darkPalette.headerBackground,
        darkPalette.headerText,
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(lightPalette.pageBackground).toContain("radial-gradient");
    expect(lightPalette.pageBackground).toContain("linear-gradient");
    expect(darkPalette.pageBackground).toContain("linear-gradient");
  });

  it.each(["#ff0055", "#00ff66", "#0055ff", "#ffff00", "#ffffff", "#000000"])(
    "keeps themed titles readable on cards in both modes (%s)", (themeColor) => {
      for (const mode of ["light", "dark"] as const) {
        const palette = createWikiThemePalette(themeColor, mode);
        for (const background of [palette.cardBackground, palette.cardBackgroundMuted]) {
          expect(wikiThemeTestHelpers.getContrastRatio(palette.titleText, background)).toBeGreaterThanOrEqual(4.5);
        }
      }
    },
  );

  it("derives different title colors from each Wiki theme", () => {
    for (const mode of ["light", "dark"] as const) {
      const red = createWikiThemePalette("#ff0055", mode).titleText;
      const blue = createWikiThemePalette("#0055ff", mode).titleText;
      expect(red).not.toBe(blue);
      const variables = buildWikiThemeCssVariables("#ff0055");
      expect(variables).toHaveProperty(`--wiki-title-text-${mode}`, red);
    }
  });

  it("softens extreme colors into derived surfaces instead of flat fills", () => {
    const palette = createWikiThemePalette("#00ff00", "light");

    expect(palette.cardBackground).not.toBe("#00ff00");
    expect(palette.cardBackgroundMuted).not.toBe("#00ff00");
    expect(palette.cardBorder).toContain("rgba(");
  });

  it("builds paired light and dark css variables for the page", () => {
    const variables = buildWikiThemeCssVariables("#4c7dff", "ja_mincho");

    expect(variables).toMatchObject({
      "--wiki-page-background-light": expect.stringContaining("radial-gradient"),
      "--wiki-page-background-dark": expect.stringContaining("linear-gradient"),
      "--wiki-header-background-light": expect.stringMatching(/^#/),
      "--wiki-header-background-dark": expect.stringMatching(/^#/),
      "--wiki-font-family": expect.stringContaining("Yu Mincho"),
    });
  });

  it("builds font variables even when theme color is not set", () => {
    expect(buildWikiThemeCssVariables(null, "en_serif")).toMatchObject({
      "--wiki-font-family": expect.stringContaining("Georgia"),
    });
  });

  it("uses self-hosted Korean font families for styles without reliable OS defaults", () => {
    expect(buildWikiThemeCssVariables(null, "ko_rounded")).toMatchObject({
      "--wiki-font-family": expect.stringContaining("Gowun Dodum"),
    });
    expect(buildWikiThemeCssVariables(null, "ko_modern")).toMatchObject({
      "--wiki-font-family": expect.stringContaining("Pretendard"),
    });
    expect(buildWikiThemeCssVariables(null, "ko_handwritten")).toMatchObject({
      "--wiki-font-family": expect.stringContaining("Nanum Pen Script"),
    });
  });
});
