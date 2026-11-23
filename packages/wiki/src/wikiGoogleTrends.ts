import type { WikiGoogleTrendsSettings } from "./types/wiki";

export const googleTrendsOrigin = "https://trends.google.com";
const localeFor = (language: string) =>
  language === "ja" || language === "ko" ? language : "en";

export const googleTrendsTimeRangeOptions = [
  { value: "today 3-m", label: "threeMonths" },
  { value: "today 6-m", label: "sixMonths" },
  { value: "today 12-m", label: "year" },
  { value: "today 2-y", label: "twoYears" },
  { value: "today 5-y", label: "fiveYears" },
  { value: "today 10-y", label: "tenYears" },
] as const satisfies readonly { value: WikiGoogleTrendsSettings["timeRange"]; label: string }[];

const googleTrendsDateRange = (timeRange: WikiGoogleTrendsSettings["timeRange"], now: Date) => {
  const months = timeRange === "today 6-m" ? 6 : timeRange === "today 2-y" ? 24 : timeRange === "today 10-y" ? 120 : null;
  if (months === null) return timeRange;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  // Clamp month ends and leap days instead of overflowing into the following month.
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(end.getUTCDate(), lastDay));
  return `${start.toISOString().slice(0, 10)} ${end.toISOString().slice(0, 10)}`;
};

export const buildGoogleTrendsExploreUrl = (
  settings: WikiGoogleTrendsSettings,
  language: string,
  now: Date = new Date(),
) => {
  const url = new URL("/trends/explore", googleTrendsOrigin);
  url.search = new URLSearchParams({
    q: settings.searchTerm,
    geo: settings.region === "all" ? "" : settings.region,
    date: googleTrendsDateRange(settings.timeRange, now),
    hl: localeFor(language),
  }).toString();
  return url.href;
};

// Pass search conditions to the official loader instead of reproducing its iframe URL.
export const buildGoogleTrendsWidgetOptions = (
  settings: WikiGoogleTrendsSettings,
  language: string,
  now: Date = new Date(),
) => {
  const explore = new URL(buildGoogleTrendsExploreUrl(settings, language, now));
  return {
    request: {
      comparisonItem: [{
        keyword: settings.searchTerm,
        geo: explore.searchParams.get("geo")!,
        time: explore.searchParams.get("date")!,
      }],
      category: 0,
      property: "",
    },
    options: {
      exploreQuery: explore.search.slice(1),
      guestPath: `${googleTrendsOrigin}/trends/embed/`,
      hl: localeFor(language),
    },
  };
};
