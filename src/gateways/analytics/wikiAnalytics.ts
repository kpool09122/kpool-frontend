import { getWikiResourceTypeFromSlug, isWikiResourceType, type WikiDetail } from "@kpool/wiki";
import { isSupportedLocale } from "@/i18n/locales";

export type AnalyticsWiki = Pick<WikiDetail,
  "wikiIdentifier" | "translationSetIdentifier" | "resourceType" | "language" | "slug"
> & { title: string };

export type WikiLinkPlacement = "basic_info" | "related_profile" | "body";
export type WikiLinkTarget = {
  href: string;
  placement: WikiLinkPlacement;
  wikiIdentifier?: string;
  resourceType?: string;
};

export type AnalyticsEvent = Record<string, string | number | null> & {
  event: "wiki_page_view" | "wiki_link_click";
};

export const resolveGtmContainerId = (enabled: string | undefined, id: string | undefined) =>
  enabled === "true" && id && /^GTM-[A-Z0-9]+$/.test(id) ? id : null;

const parseWikiPath = (path: string) => {
  const match = /^\/([^/]+)\/wiki\/([^/]+)\/?$/.exec(path)
    ?? /^\/wiki\/([^/]+)\/([^/]+)\/?$/.exec(path);
  if (!match) return null;
  try {
    const language = decodeURIComponent(match[1]);
    return isSupportedLocale(language) ? { language, slug: decodeURIComponent(match[2]) } : null;
  } catch {
    return null;
  }
};

const wikiFields = (wiki: AnalyticsWiki) => ({
  wiki_id: wiki.wikiIdentifier,
  wiki_translation_set_id: wiki.translationSetIdentifier,
  wiki_type: wiki.resourceType,
  wiki_language: wiki.language,
});

type BrowserContext = { location: string; referrer: string };

// Each mounted application gets its own tracker; no cross-request or durable user state.
export const createWikiAnalytics = (
  readBrowser: () => BrowserContext,
  send: (event: AnalyticsEvent) => void,
) => {
  let currentPath: string | null = null;
  let currentLocation = "";
  let referrer = "";
  let viewed = false;

  const observeNavigation = (pathname: string) => {
    const browser = readBrowser();
    if (pathname !== currentPath) {
      referrer = currentLocation || browser.referrer;
      currentPath = pathname;
      viewed = false;
    }
    currentLocation = browser.location;
  };

  const matchesWiki = (pathname: string, wiki: AnalyticsWiki) => {
    const route = parseWikiPath(pathname);
    return route?.slug === wiki.slug && route.language === wiki.language;
  };

  return {
    observeNavigation,
    pageView(pathname: string, wiki: AnalyticsWiki) {
      observeNavigation(pathname);
      if (viewed || !matchesWiki(pathname, wiki)) return;
      viewed = true;
      send({
        event: "wiki_page_view",
        analytics_schema_version: 1,
        ...wikiFields(wiki),
        page_location: currentLocation,
        page_referrer: referrer,
        page_title: wiki.title,
        // Explicitly clear values retained by GTM's data model from earlier clicks.
        target_wiki_id: null,
        target_wiki_type: null,
        target_wiki_language: null,
        link_path: null,
        link_placement: null,
      });
    },
    linkClick(pathname: string, wiki: AnalyticsWiki, target: WikiLinkTarget) {
      observeNavigation(pathname);
      if (!matchesWiki(pathname, wiki) || !URL.canParse(target.href, currentLocation)) return;
      const url = new URL(target.href, currentLocation);
      if (url.origin !== new URL(currentLocation).origin) return;
      const route = parseWikiPath(url.pathname);
      if (!route) return;
      send({
        event: "wiki_link_click",
        analytics_schema_version: 1,
        ...wikiFields(wiki),
        page_location: currentLocation,
        page_referrer: referrer,
        page_title: wiki.title,
        target_wiki_id: target.wikiIdentifier ?? null,
        target_wiki_type: target.resourceType && isWikiResourceType(target.resourceType)
          ? target.resourceType : getWikiResourceTypeFromSlug(route.slug),
        target_wiki_language: route.language,
        link_path: url.pathname,
        link_placement: target.placement,
      });
    },
  };
};

export const createBrowserWikiAnalytics = () => createWikiAnalytics(
  () => ({ location: window.location.href, referrer: document.referrer }),
  (event) => {
    // A blocked/replaced tag must never interrupt Wiki navigation or rendering.
    try {
      const target = window as Window & { dataLayer?: unknown[] };
      target.dataLayer ??= [];
      target.dataLayer.push(event);
    } catch {
      // Analytics is best-effort and has no user-facing error state.
    }
  },
);
