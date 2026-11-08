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
  event: "wiki_page_view" | "wiki_link_click" | "app_page_view" | "analytics_page_end" | "analytics_context";
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

const emptyWikiFields = { wiki_id: null, wiki_translation_set_id: null, wiki_type: null, wiki_language: null };
const emptyLinkFields = { target_wiki_id: null, target_wiki_type: null, target_wiki_language: null, link_path: null, link_placement: null };

// URL queries, fragments and referrer credentials must never reach analytics.
const safeLocation = (value: string) => {
  if (!URL.canParse(value)) return "";
  const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:" ? `${url.origin}${url.pathname}` : "";
};

// Each mounted application gets its own tracker; no cross-request or durable user state.
export const createWikiAnalytics = (
  readBrowser: () => BrowserContext,
  send: (event: AnalyticsEvent) => void,
  updateContext: (event: AnalyticsEvent) => void = () => {},
) => {
  let currentPath: string | null = null;
  let currentLocation = "";
  let referrer = "";
  let viewed = false;
  let suspended = false;
  let context: AnalyticsEvent | null = null;

  const suspend = () => {
    if (!context || suspended) return;
    // Send while the Google tag still holds the OLD page context. GA4 owns the
    // engagement clock: an app timer would double-count its automatic duration.
    send({ ...context, event: "analytics_page_end" });
    suspended = true;
  };
  const setContext = (fields = emptyWikiFields as Record<string, string | null>, title = "k-pool") => {
    context = {
      event: "analytics_context", analytics_schema_version: 1,
      ...fields, ...emptyLinkFields,
      page_location: currentLocation, page_referrer: referrer, page_title: title,
    };
    updateContext(context);
  };
  const observeNavigation = (pathname: string) => {
    if (pathname === currentPath) return;
    const browser = readBrowser();
    suspend();
    referrer = currentLocation || safeLocation(browser.referrer);
    currentPath = pathname;
    currentLocation = safeLocation(browser.location);
    viewed = false;
    suspended = false;
    // Pending/failed public data has NO Wiki attribution. Only pageView can set it.
    setContext();
    if (!parseWikiPath(pathname)) {
      viewed = true;
      send({ ...context!, event: "app_page_view" });
    }
  };

  const matchesWiki = (pathname: string, wiki: AnalyticsWiki) => {
    const route = parseWikiPath(pathname);
    return route?.slug === wiki.slug && route.language === wiki.language;
  };

  return {
    observeNavigation,
    suspend,
    resume() { suspended = false; },
    pageView(pathname: string, wiki: AnalyticsWiki) {
      observeNavigation(pathname);
      if (viewed || !matchesWiki(pathname, wiki)) return;
      viewed = true;
      // Flush any pending un-attributed loading time before applying the Wiki.
      suspend();
      suspended = false;
      setContext(wikiFields(wiki), wiki.title);
      send({ ...context!, event: "wiki_page_view" });
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

const pushToDataLayer = (event: AnalyticsEvent) => {
  // A blocked/replaced tag must never interrupt navigation or rendering.
  try {
    const target = window as Window & { dataLayer?: unknown[] };
    target.dataLayer ??= [];
    target.dataLayer.push(event);
  } catch {
    // Analytics is best-effort and has no user-facing error state.
  }
};

export const createBrowserWikiAnalytics = () => createWikiAnalytics(
  () => ({ location: window.location.href, referrer: document.referrer }),
  pushToDataLayer,
  pushToDataLayer,
);
