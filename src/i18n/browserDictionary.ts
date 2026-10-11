import { dictionaries } from "./dictionaries";
import { fallbackLocale, localeCookieName, normalizeLocale } from "./locales";

export const getBrowserDictionary = (language?: string) => {
  const cookieLanguage = typeof document === "undefined" ? undefined
    : document.cookie.split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${localeCookieName}=`))?.slice(localeCookieName.length + 1);
  return dictionaries[normalizeLocale(language) ?? normalizeLocale(cookieLanguage) ?? fallbackLocale];
};
