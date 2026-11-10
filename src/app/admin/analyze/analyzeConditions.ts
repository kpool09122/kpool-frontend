import { defaultReportingPeriod, validReportingPeriod } from "./reportingPeriod";
import { countryCodes } from "@/utils/countryOptions";
import coverage from "./regionalMapCoverage.json";
import { isSelectableRegion } from "./regionalSelection";

export type AnalyzeConditions = {
  from: string;
  to: string;
  translationSetIdentifier: string;
  wikiName: string;
  language: string;
};

export const analyzeConditionKeys = ["from", "to", "translationSetIdentifier", "wikiName", "language"] as const;
export const analyzeLocationKeys = ["country", "region", "view"] as const;

export type AnalyzeLocation = {
  country?: string | null;
  region?: string | null;
  domestic: boolean;
};

export function readAnalyzeLocation(query: string): AnalyzeLocation & { invalid: boolean } {
  const params = new URLSearchParams(query);
  const code = params.get("country");
  const region = params.get("region");
  const view = params.get("view");
  const country = code === "unknown" ? null : code ?? undefined;
  if (typeof country === "string" && !(countryCodes as readonly string[]).includes(country)) {
    return { domestic: false, invalid: true };
  }
  const domestic = view === "regional" || region !== null;
  const supported = typeof country === "string" && coverage.codes.some((code) => code.startsWith(`${country}-`));
  const validRegion = region === null || region === "unknown" || (
    typeof country === "string" && region.startsWith(`${country}-`)
    && coverage.codes.includes(region) && isSelectableRegion(country, region)
  );
  if ((view !== null && view !== "regional") || (domestic && !supported) || !validRegion) {
    return { country, domestic: false, invalid: true };
  }
  return { country, region: region === "unknown" ? null : region ?? undefined, domestic, invalid: false };
}

export function analyzeLocationUrl(href: string, location: AnalyzeLocation): string {
  const url = new URL(href);
  for (const key of analyzeLocationKeys) url.searchParams.delete(key);
  if (location.country !== undefined) url.searchParams.set("country", location.country ?? "unknown");
  if (location.domestic) {
    url.searchParams.set("view", "regional");
    if (location.region !== undefined) url.searchParams.set("region", location.region ?? "unknown");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export const defaultAnalyzeConditions = (): AnalyzeConditions => ({
  ...defaultReportingPeriod(), translationSetIdentifier: "", wikiName: "", language: "",
});

export function analyzeConditionsError(conditions: AnalyzeConditions, now = new Date()): "period" | "filters" | null {
  if (!validReportingPeriod(conditions.from, conditions.to, now)) return "period";
  const validFilters = (!conditions.translationSetIdentifier || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conditions.translationSetIdentifier))
    && ["", "ja", "en", "ko"].includes(conditions.language)
    && conditions.wikiName.length <= 200;
  return validFilters ? null : "filters";
}

export function readAnalyzeConditions(query: string, fallback: AnalyzeConditions, now = new Date()) {
  const params = new URLSearchParams(query);
  const translationSetIdentifier = params.get("translationSetIdentifier") ?? "";
  const conditions: AnalyzeConditions = {
    from: params.get("from") ?? fallback.from,
    to: params.get("to") ?? fallback.to,
    translationSetIdentifier,
    wikiName: translationSetIdentifier ? (params.get("wikiName") ?? "").trim() : "",
    language: params.get("language") ?? "",
  };
  const error = analyzeConditionsError(conditions, now);
  return { conditions: error ? fallback : conditions, requestedConditions: conditions, invalid: error !== null, error };
}

export function analyzeConditionsUrl(href: string, conditions: AnalyzeConditions): string {
  const url = new URL(href);
  for (const key of analyzeConditionKeys) {
    if (conditions[key]) url.searchParams.set(key, conditions[key]);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
