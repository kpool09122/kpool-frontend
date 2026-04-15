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
    expect(darkPalette.pageBackground).toContain("linear-gradient");
  });

  it("softens extreme colors into derived surfaces instead of flat fills", () => {
    const palette = createWikiThemePalette("#00ff00", "light");

    expect(palette.cardBackground).not.toBe("#00ff00");
    expect(palette.cardBackgroundMuted).not.toBe("#00ff00");
    expect(palette.cardBorder).toContain("rgba(");
  });

  it("builds paired light and dark css variables for the page", () => {
    const variables = buildWikiThemeCssVariables("#4c7dff");

    expect(variables).toMatchObject({
      "--wiki-page-background-light": expect.stringContaining("radial-gradient"),
      "--wiki-page-background-dark": expect.stringContaining("linear-gradient"),
      "--wiki-header-background-light": expect.stringMatching(/^#/),
      "--wiki-header-background-dark": expect.stringMatching(/^#/),
    });
  });
});
