import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import "./globals.css";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { Header } from "./Header";
import { I18nProvider } from "../i18n/I18nProvider";
import { localeCookieName, resolveLocale } from "../i18n/locales";
import { siteTitle } from "./metadata";
import { QueryProvider } from "./QueryProvider";
import { ThemeInitializer } from "./ThemeInitializer";

export const metadata: Metadata = {
  title: siteTitle,
  description:
    "Brand color tokens and a minimal palette preview for the K-Pool frontend.",
  icons: {
    icon: "/kpool.ico",
    shortcut: "/kpool.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });
  const locale = resolveLocale({
    identityLanguage: authenticatedIdentity?.language,
    savedLocale: cookieStore.get(localeCookieName)?.value,
    country: headerStore.get("x-vercel-ip-country"),
  });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <I18nProvider initialLocale={locale}>
          <QueryProvider>
            <ThemeInitializer />
            <Header initialIsAuthenticated={authenticatedIdentity !== null} />
            {children}
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
