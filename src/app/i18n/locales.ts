export const supportedLocales = ["ja", "en", "ko"] as const;

export type Locale = (typeof supportedLocales)[number];

export const fallbackLocale: Locale = "en";
export const localeCookieName = "kpool-locale";

const localeSet = new Set<string>(supportedLocales);

export const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === "string" && localeSet.has(value);

export const normalizeLocale = (value: unknown): Locale | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  const [language] = normalizedValue.split(/[-_]/);

  return isSupportedLocale(language) ? language : null;
};

export const localeFromCountry = (country: unknown): Locale | null => {
  if (typeof country !== "string") {
    return null;
  }

  const normalizedCountry = country.trim().toUpperCase();

  if (normalizedCountry === "JP") {
    return "ja";
  }

  if (normalizedCountry === "KR") {
    return "ko";
  }

  return null;
};

export const resolveLocale = ({
  identityLanguage,
  savedLocale,
  country,
}: {
  identityLanguage?: unknown;
  savedLocale?: unknown;
  country?: unknown;
}): Locale =>
  normalizeLocale(savedLocale) ??
  normalizeLocale(identityLanguage) ??
  localeFromCountry(country) ??
  fallbackLocale;

export const resolveWikiListLocale = ({
  identityLanguage,
  savedLocale,
}: {
  identityLanguage?: unknown;
  savedLocale?: unknown;
}): Locale =>
  normalizeLocale(savedLocale) ??
  normalizeLocale(identityLanguage) ??
  fallbackLocale;

export const localeLabels: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
};
