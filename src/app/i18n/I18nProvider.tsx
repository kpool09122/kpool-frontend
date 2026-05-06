"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { dictionaries, type I18nDictionary } from "./dictionaries";
import {
  fallbackLocale,
  localeCookieName,
  normalizeLocale,
  supportedLocales,
  type Locale,
} from "./locales";

type I18nContextValue = {
  locale: Locale;
  dictionary: I18nDictionary;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "ja",
  dictionary: dictionaries.ja,
  setLocale: () => undefined,
});

const persistLocale = (locale: Locale): void => {
  document.cookie = `${localeCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
};

export function I18nProvider({
  children,
  initialLocale = fallbackLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    normalizeLocale(initialLocale) ?? fallbackLocale,
  );
  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        dictionary: dictionaries[locale],
        setLocale,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export { dictionaries, supportedLocales };
export type { Locale };
