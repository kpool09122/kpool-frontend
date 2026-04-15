import type { CSSProperties } from "react";

import type { ThemeMode } from "@/app/themeMode";

type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

type HslColor = {
  hue: number;
  saturation: number;
  lightness: number;
};

type ThemeBase = {
  surfaceBase: string;
  surfaceRaised: string;
  textStrong: string;
  headerBase: string;
  highlight: string;
};

export type WikiThemePalette = {
  pageBackground: string;
  headerBackground: string;
  headerText: string;
  heroOverlay: string;
  heroAccent: string;
  cardBackground: string;
  cardBackgroundMuted: string;
  cardBorder: string;
  accentBackground: string;
  accentText: string;
};

const themeBases: Record<ThemeMode, ThemeBase> = {
  light: {
    surfaceBase: "#fffbf7",
    surfaceRaised: "#ffffff",
    textStrong: "#1d2f49",
    headerBase: "#3560a3",
    highlight: "#ffd6c2",
  },
  dark: {
    surfaceBase: "#16223a",
    surfaceRaised: "#21304b",
    textStrong: "#fff7ef",
    headerBase: "#9fc0f2",
    highlight: "#4a6492",
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeHexColor = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const normalized = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }

  return null;
};

const hexToRgb = (hexColor: string): RgbColor => {
  const normalized = hexColor.slice(1);

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = ({ red, green, blue }: RgbColor): string =>
  `#${[red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const rgbToRgba = ({ red, green, blue }: RgbColor, alpha: number): string =>
  `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${clamp(alpha, 0, 1)})`;

const mixColors = (left: string, right: string, ratio: number): string => {
  const mixRatio = clamp(ratio, 0, 1);
  const leftColor = hexToRgb(left);
  const rightColor = hexToRgb(right);

  return rgbToHex({
    red: leftColor.red + (rightColor.red - leftColor.red) * mixRatio,
    green: leftColor.green + (rightColor.green - leftColor.green) * mixRatio,
    blue: leftColor.blue + (rightColor.blue - leftColor.blue) * mixRatio,
  });
};

const rgbToHsl = ({ red, green, blue }: RgbColor): HslColor => {
  const redUnit = red / 255;
  const greenUnit = green / 255;
  const blueUnit = blue / 255;
  const maxChannel = Math.max(redUnit, greenUnit, blueUnit);
  const minChannel = Math.min(redUnit, greenUnit, blueUnit);
  const delta = maxChannel - minChannel;
  const lightness = (maxChannel + minChannel) / 2;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - maxChannel - minChannel) : delta / (maxChannel + minChannel);

  const hueSegment =
    maxChannel === redUnit
      ? ((greenUnit - blueUnit) / delta + (greenUnit < blueUnit ? 6 : 0)) / 6
      : maxChannel === greenUnit
        ? ((blueUnit - redUnit) / delta + 2) / 6
        : ((redUnit - greenUnit) / delta + 4) / 6;

  return {
    hue: hueSegment,
    saturation,
    lightness,
  };
};

const hslToRgb = ({ hue, saturation, lightness }: HslColor): RgbColor => {
  if (saturation === 0) {
    const grayscale = lightness * 255;
    return { red: grayscale, green: grayscale, blue: grayscale };
  }

  const hueToChannel = (offset: number): number => {
    const wrapped = (offset + 1) % 1;

    if (wrapped < 1 / 6) {
      return temporaryOne + (temporaryTwo - temporaryOne) * 6 * wrapped;
    }

    if (wrapped < 1 / 2) {
      return temporaryTwo;
    }

    if (wrapped < 2 / 3) {
      return temporaryOne + (temporaryTwo - temporaryOne) * (2 / 3 - wrapped) * 6;
    }

    return temporaryOne;
  };

  const temporaryTwo =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const temporaryOne = 2 * lightness - temporaryTwo;

  return {
    red: hueToChannel(hue + 1 / 3) * 255,
    green: hueToChannel(hue) * 255,
    blue: hueToChannel(hue - 1 / 3) * 255,
  };
};

const getRelativeLuminance = (hexColor: string): number => {
  const transform = (value: number): number => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  const { red, green, blue } = hexToRgb(hexColor);

  return 0.2126 * transform(red) + 0.7152 * transform(green) + 0.0722 * transform(blue);
};

const getContrastRatio = (left: string, right: string): number => {
  const leftLuminance = getRelativeLuminance(left);
  const rightLuminance = getRelativeLuminance(right);
  const [lighter, darker] =
    leftLuminance >= rightLuminance
      ? [leftLuminance, rightLuminance]
      : [rightLuminance, leftLuminance];

  return (lighter + 0.05) / (darker + 0.05);
};

const pickReadableText = (background: string, darkText: string, lightText: string): string =>
  getContrastRatio(background, darkText) >= getContrastRatio(background, lightText)
    ? darkText
    : lightText;

const getBalancedThemeColor = (themeColor: string, mode: ThemeMode): string => {
  const hslColor = rgbToHsl(hexToRgb(themeColor));

  return rgbToHex(
    hslToRgb({
      hue: hslColor.hue,
      saturation: clamp(hslColor.saturation, 0.24, mode === "light" ? 0.72 : 0.64),
      lightness: clamp(
        hslColor.lightness,
        mode === "light" ? 0.38 : 0.5,
        mode === "light" ? 0.62 : 0.72,
      ),
    }),
  );
};

export const createWikiThemePalette = (
  themeColor: string,
  mode: ThemeMode,
): WikiThemePalette => {
  const base = themeBases[mode];
  const balancedThemeColor = getBalancedThemeColor(themeColor, mode);
  const glowColor = mixColors(base.highlight, balancedThemeColor, mode === "light" ? 0.48 : 0.62);
  const headerBackground = mixColors(base.headerBase, balancedThemeColor, mode === "light" ? 0.62 : 0.44);
  const cardBackground = mixColors(base.surfaceRaised, balancedThemeColor, mode === "light" ? 0.08 : 0.16);
  const cardBackgroundMuted = mixColors(base.surfaceBase, balancedThemeColor, mode === "light" ? 0.12 : 0.2);
  const accentBackground = mixColors(base.highlight, balancedThemeColor, mode === "light" ? 0.42 : 0.56);
  const pageStart = mixColors(base.surfaceBase, balancedThemeColor, mode === "light" ? 0.06 : 0.14);
  const pageEnd = mixColors(base.surfaceRaised, balancedThemeColor, mode === "light" ? 0.12 : 0.18);

  return {
    pageBackground: `radial-gradient(circle at top, ${rgbToRgba(hexToRgb(glowColor), mode === "light" ? 0.82 : 0.58)}, transparent 40%), linear-gradient(180deg, ${pageStart} 0%, ${pageEnd} 100%)`,
    headerBackground,
    headerText: pickReadableText(headerBackground, "#15243b", "#fffaf4"),
    heroOverlay: `linear-gradient(180deg, ${rgbToRgba(hexToRgb(mixColors("#15243b", balancedThemeColor, 0.2)), mode === "light" ? 0.08 : 0.14)} 0%, ${rgbToRgba(hexToRgb(mixColors("#15243b", balancedThemeColor, 0.56)), mode === "light" ? 0.72 : 0.88)} 100%)`,
    heroAccent: pickReadableText(accentBackground, "#15243b", "#fffaf4"),
    cardBackground,
    cardBackgroundMuted,
    cardBorder: rgbToRgba(hexToRgb(mixColors(base.headerBase, balancedThemeColor, mode === "light" ? 0.4 : 0.5)), mode === "light" ? 0.24 : 0.34),
    accentBackground,
    accentText: pickReadableText(accentBackground, "#15243b", "#fffaf4"),
  };
};

export const buildWikiThemeCssVariables = (
  themeColor: string | null | undefined,
): CSSProperties | undefined => {
  const normalizedThemeColor = normalizeHexColor(themeColor);

  if (!normalizedThemeColor) {
    return undefined;
  }

  const lightPalette = createWikiThemePalette(normalizedThemeColor, "light");
  const darkPalette = createWikiThemePalette(normalizedThemeColor, "dark");

  return {
    "--wiki-page-background-light": lightPalette.pageBackground,
    "--wiki-page-background-dark": darkPalette.pageBackground,
    "--wiki-header-background-light": lightPalette.headerBackground,
    "--wiki-header-background-dark": darkPalette.headerBackground,
    "--wiki-header-text-light": lightPalette.headerText,
    "--wiki-header-text-dark": darkPalette.headerText,
    "--wiki-hero-overlay-light": lightPalette.heroOverlay,
    "--wiki-hero-overlay-dark": darkPalette.heroOverlay,
    "--wiki-hero-accent-light": lightPalette.heroAccent,
    "--wiki-hero-accent-dark": darkPalette.heroAccent,
    "--wiki-card-background-light": lightPalette.cardBackground,
    "--wiki-card-background-dark": darkPalette.cardBackground,
    "--wiki-card-background-muted-light": lightPalette.cardBackgroundMuted,
    "--wiki-card-background-muted-dark": darkPalette.cardBackgroundMuted,
    "--wiki-card-border-light": lightPalette.cardBorder,
    "--wiki-card-border-dark": darkPalette.cardBorder,
    "--wiki-accent-background-light": lightPalette.accentBackground,
    "--wiki-accent-background-dark": darkPalette.accentBackground,
    "--wiki-accent-text-light": lightPalette.accentText,
    "--wiki-accent-text-dark": darkPalette.accentText,
  } as CSSProperties;
};

export const wikiThemeTestHelpers = {
  getContrastRatio,
  normalizeHexColor,
};
