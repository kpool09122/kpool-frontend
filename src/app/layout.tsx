import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";
import { Header } from "./Header";
import { themeStorageKey } from "./themeMode";

export const metadata: Metadata = {
  title: "K-Pool Theme Preview",
  description:
    "Brand color tokens and a minimal palette preview for the K-Pool frontend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
        >{`(() => {
  const storageKey = "${themeStorageKey}";
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const readTheme = () => {
    const storedTheme = window.localStorage.getItem(storageKey);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : getSystemTheme();
  };
  const syncThemeLabel = (theme) => {
    document.querySelectorAll("[data-theme-label]").forEach((element) => {
      element.textContent = theme === "dark" ? "Dark" : "Light";
    });
  };
  const applyTheme = (theme, persist) => {
    document.documentElement.dataset.theme = theme;
    syncThemeLabel(theme);
    if (persist) {
      window.localStorage.setItem(storageKey, theme);
    }
  };

  applyTheme(readTheme(), false);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest("[data-theme-toggle]");
    if (!button) {
      return;
    }

    const currentTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
  });
})();`}</Script>
        <Header />
        {children}
      </body>
    </html>
  );
}
