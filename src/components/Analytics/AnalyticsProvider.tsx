"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
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

export function AnalyticsProvider({ children, containerId }: {
  children: ReactNode;
  containerId: string | null;
}) {
  const pathname = usePathname();
  const [tracker] = useState(createBrowserWikiAnalytics);
  // Wiki以外への遷移も描画確定後に記録し、同じWikiに戻ったときは新しい閲覧として扱う。
  // クリックだけでは拾えないブラウザーの戻る・進むも、pathnameの変化で検知する。
  useEffect(() => {
    if (containerId) tracker.observeNavigation(pathname);
  }, [containerId, pathname, tracker]);

  const value = useMemo<AnalyticsContextValue | null>(() => containerId ? {
    pageView: (wiki) => tracker.pageView(pathname, wiki),
    linkClick: (wiki, target) => tracker.linkClick(pathname, wiki, target),
  } : null, [containerId, pathname, tracker]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      {containerId ? (
        <Script id="kpool-gtm" strategy="afterInteractive">{
          `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`
        }</Script>
      ) : null}
    </AnalyticsContext.Provider>
  );
}
