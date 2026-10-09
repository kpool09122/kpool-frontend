"use client";

import { useEffect, useMemo, type MouseEvent, type ReactNode } from "react";
import type { WikiDetail } from "@kpool/wiki";
import type { AnalyticsWiki, WikiLinkPlacement } from "@/gateways/analytics/wikiAnalytics";
import { useWikiAnalytics } from "./AnalyticsProvider";

const isPlacement = (value: string | undefined): value is WikiLinkPlacement =>
  value === "basic_info" || value === "related_profile" || value === "body";

export function PublicWikiAnalytics({ wiki, children }: { wiki: WikiDetail; children: ReactNode }) {
  const analytics = useWikiAnalytics();
  const { wikiIdentifier, translationSetIdentifier, resourceType, language, slug } = wiki;
  const title = wiki.title ?? wiki.basic.name;
  const subject = useMemo<AnalyticsWiki>(() => ({
    wikiIdentifier, translationSetIdentifier, resourceType, language, slug, title,
  }), [wikiIdentifier, translationSetIdentifier, resourceType, language, slug, title]);

  // 公開Wikiの表示が確定した後に外部の計測システムへ通知するため、Effectで送信する。
  // レンダー中の送信を避け、直接アクセスや履歴移動も計測する。重複送信はtracker側で抑止する。
  useEffect(() => { analytics?.pageView(subject); }, [analytics, subject]);

  const trackLink = (event: MouseEvent<HTMLDivElement>) => {
    if (!analytics || (event.type === "auxclick" ? event.button !== 1 : event.button !== 0)) return;
    const element = event.target instanceof Element ? event.target : null;
    const anchor = element?.closest<HTMLAnchorElement>("a[data-wiki-link-placement]");
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    const placement = anchor.dataset.wikiLinkPlacement;
    if (!isPlacement(placement)) return;
    analytics.linkClick(subject, {
      href: anchor.href,
      placement,
      wikiIdentifier: anchor.dataset.wikiId,
      resourceType: anchor.dataset.wikiResourceType,
    });
  };

  return <div onClickCapture={trackLink} onAuxClickCapture={trackLink}>{children}</div>;
}
