import type { Metadata } from "next";

import "./globals.css";
import { Header } from "./Header";
import { ThemeInitializer } from "./ThemeInitializer";

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
        <ThemeInitializer />
        <Header />
        {children}
      </body>
    </html>
  );
}
