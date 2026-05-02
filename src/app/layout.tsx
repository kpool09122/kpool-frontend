import type { Metadata } from "next";
import { cookies } from "next/headers";

import "./globals.css";
import { fetchAuthenticatedIdentity } from "./authIdentity";
import { Header } from "./Header";
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
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader: cookieStore.toString(),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeInitializer />
        <Header initialIsAuthenticated={authenticatedIdentity !== null} />
        {children}
      </body>
    </html>
  );
}
