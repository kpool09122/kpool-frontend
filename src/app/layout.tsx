import "@fontsource/gowun-dodum/korean.css";
import "@fontsource/nanum-pen-script/korean.css";
import "@fontsource/pretendard/400.css";
import "react-image-crop/dist/ReactCrop.css";
import "./globals.css";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { I18nProvider } from "../i18n/I18nProvider";
import { buildPageMetadata } from "./metadata";
import { getRequestContext } from "./requestContext";
import { QueryProvider } from "./QueryProvider";
import { ThemeInitializer } from "./ThemeInitializer";
import { themeBootstrapScript } from "./themeMode";
import { AnalyticsProvider } from "@/components/Analytics/AnalyticsProvider";
import { resolveGtmContainerId } from "@/gateways/analytics/wikiAnalytics";
import { VideoPlaybackProvider } from "@/components/VideoPlayback/VideoPlaybackProvider";

export async function generateMetadata() {
  const { locale } = await getRequestContext();
  return {
    ...buildPageMetadata(locale, "home"),
    icons: {
      icon: "/kpool.ico",
      shortcut: "/kpool.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, authenticatedIdentity } = await getRequestContext();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <I18nProvider initialLocale={locale}>
          <QueryProvider>
            <VideoPlaybackProvider>
              <AnalyticsProvider containerId={resolveGtmContainerId(
                process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
                process.env.NEXT_PUBLIC_GTM_ID,
              )}>
                <ThemeInitializer />
                <Header
                  initialIdentity={authenticatedIdentity}
                  initialIsAuthenticated={authenticatedIdentity !== null}
                />
                <div className="flex flex-1 flex-col">{children}</div>
                <Footer />
              </AnalyticsProvider>
            </VideoPlaybackProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
