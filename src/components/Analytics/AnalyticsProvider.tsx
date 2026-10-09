"use client";

import { createContext, useContext, useEffect, useMemo, useState, Suspense, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  createBrowserWikiAnalytics,
  type AnalyticsWiki,
  type WikiLinkTarget,
} from "@/gateways/analytics/wikiAnalytics";

type AnalyticsContextValue = {
  pageView: (wiki: AnalyticsWiki) => void;
  linkClick: (wiki: AnalyticsWiki, target: WikiLinkTarget) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);
export const useWikiAnalytics = () => useContext(AnalyticsContext);

function AnalyticsNavigationObserver({ pathname, tracker }: {
  pathname: string;
  tracker: ReturnType<typeof createBrowserWikiAnalytics>;
}) {
  const searchParams = useSearchParams();
  // Wiki以外や履歴移動も描画確定後に記録し、クエリだけの変更でも直前URLを最新に保つ。
  // 閲覧の重複抑止と再訪の判定は、tracker側で引き続きパス単位で行う。
  useEffect(() => {
    tracker.observeNavigation(pathname);
  }, [pathname, searchParams, tracker]);
  return null;
}

export function AnalyticsProvider({ children, containerId }: {
  children: ReactNode;
  containerId: string | null;
}) {
  const pathname = usePathname();
  const [tracker] = useState(createBrowserWikiAnalytics);

  const value = useMemo<AnalyticsContextValue | null>(() => containerId ? {
    pageView: (wiki) => tracker.pageView(pathname, wiki),
    linkClick: (wiki, target) => tracker.linkClick(pathname, wiki, target),
  } : null, [containerId, pathname, tracker]);

  return (
    <AnalyticsContext.Provider value={value}>
      {containerId ? (
        // クエリの読み取りに伴うSuspenseの範囲を計測用コンポーネントに限定する。
        <Suspense fallback={null}>
          <AnalyticsNavigationObserver pathname={pathname} tracker={tracker} />
        </Suspense>
      ) : null}
      {children}
      {containerId ? (
        <Script id="kpool-gtm" strategy="afterInteractive">{
          `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`
        }</Script>
      ) : null}
    </AnalyticsContext.Provider>
  );
}
