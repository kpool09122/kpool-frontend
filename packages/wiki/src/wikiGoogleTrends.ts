import type { WikiGoogleTrendsSettings } from "./types/wiki";

export const googleTrendsOrigin = "https://trends.google.com";
const localeFor = (language: string) =>
  language === "ja" || language === "ko" ? language : "en";

export const buildGoogleTrendsExploreUrl = (
  settings: WikiGoogleTrendsSettings,
  language: string,
) => {
  const url = new URL("/trends/explore", googleTrendsOrigin);
  url.search = new URLSearchParams({
    q: settings.searchTerm,
    geo: settings.region,
    date: settings.timeRange,
    hl: localeFor(language),
  }).toString();
  return url.href;
};

// The official embed_loader.js (4278_RC01) generates this TIMESERIES iframe.
// Use the official frame directly: no third-party script executes in the host page,
// and our origin/source-checked message listener can be removed on unmount.
export const buildGoogleTrendsEmbedUrl = (
  settings: WikiGoogleTrendsSettings,
  language: string,
) => {
  const url = new URL("/trends/embed/explore/TIMESERIES", googleTrendsOrigin);
  const explore = new URL(buildGoogleTrendsExploreUrl(settings, language));
  url.search = new URLSearchParams({
    req: JSON.stringify({
      comparisonItem: [
        {
          keyword: settings.searchTerm,
          geo: settings.region,
          time: settings.timeRange,
        },
      ],
      category: 0,
      property: "",
    }),
    tz: "0",
    eq: explore.search.slice(1),
    hl: localeFor(language),
  }).toString();
  return url.href;
};
