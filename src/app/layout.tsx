import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import "./globals.css";
import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { AuthProvider } from "./AuthProvider";
import { Header } from "./Header";
import { I18nProvider } from "../i18n/I18nProvider";
import { localeCookieName, resolveLocale } from "../i18n/locales";
import { ThemeInitializer } from "./ThemeInitializer";

export const metadata: Metadata = {
  title: "K-Pool Theme Preview",
  description:
    "Brand color tokens and a minimal palette preview for the K-Pool frontend.",
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
          <AuthProvider
            key={authenticatedIdentity?.identityIdentifier ?? "guest"}
            initialIdentity={authenticatedIdentity}
          >
            <ThemeInitializer />
            <Header
              initialIsAuthenticated={authenticatedIdentity !== null}
            />
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
