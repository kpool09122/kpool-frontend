"use client";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AccountStatusMessage } from "@/components/Account";
import { getAnalyzeReport } from "@/gateways/analyze/analyzeReports";
import { useAdmin } from "../AdminProvider";
import { latestReportingDay } from "./reportingPeriod";
import { AnalyzeWikiSelect } from "./AnalyzeWikiSelect";
import { CountryGlobe } from "./CountryGlobe";
import type { CountryGlobeMetric } from "./countryColorScale";
import { MetricCard } from "./MetricCard";
import { useCountryReport } from "./useCountryReport";
import { DomesticAnalysis } from "./DomesticAnalysis";
import {
  analyzeConditionsUrl,
  analyzeLocationUrl,
  readAnalyzeLocation,
  type AnalyzeLocation,
  defaultAnalyzeConditions,
  readAnalyzeConditions,
  analyzeConditionsError,
  type AnalyzeConditions,
} from "./analyzeConditions";

export function AnalyzeDashboard({
  scope,
  version,
  initialCountry = null,
}: {
  scope: string;
  version: number;
  initialCountry?: string | null;
}) {
  const {
    locale,
    t: {
      analyze: { report: t },
    },
  } = useAdmin();
  const query = useSearchParams().toString();
  const [defaults] = useState(defaultAnalyzeConditions);
  const applied = useMemo(() => readAnalyzeConditions(query, defaults), [query, defaults]);
  const conditions = applied.conditions;
  const formConditions = applied.requestedConditions;
  const [invalid, setInvalid] = useState<"period" | "filters" | null>(null);
  const conditionsError = invalid ?? applied.error;
  const location = useMemo(() => readAnalyzeLocation(query), [query]);
  const domesticCountry = location.domestic && typeof location.country === "string" ? location.country : undefined;
  const [regionalRevision, setRegionalRevision] = useState(0);
  const selectedCountry = location.country;
  const globeSelection = useMemo(() => ({ country: selectedCountry }), [selectedCountry]);
  const period = useMemo(() => ({
    from: conditions.from,
    to: conditions.to,
  }), [conditions.from, conditions.to]);
  const appQuery = new URLSearchParams(period).toString();
  const wikiParams = new URLSearchParams(period);
  for (const key of [
    "translationSetIdentifier",
    "language",
  ] as const)
    if (conditions[key]) wikiParams.set(key, conditions[key]);
  const wikiQuery = wikiParams.toString();
  const options = {
    staleTime: 0,
    gcTime: 0,
    retry: false as const,
    refetchOnWindowFocus: "always" as const,
  };
  const app = useQuery({
    ...options,
    queryKey: ["admin", "analyze", "app", scope, version, appQuery],
    queryFn: ({ signal }) => getAnalyzeReport("app", appQuery, signal),
  });
  const wiki = useQuery({
    ...options,
    queryKey: ["admin", "analyze", "wiki", scope, version, wikiQuery],
    queryFn: ({ signal }) => getAnalyzeReport("wiki", wikiQuery, signal),
  });
  const countryWiki = useCountryReport({ kind: "wiki", query: wikiQuery, scope, version, country: selectedCountry, globalResult: wiki.data });
  const countryApp = useCountryReport({ kind: "app", query: appQuery, scope, version, country: selectedCountry, globalResult: app.data });
  const detailApp = selectedCountry === undefined ? app.data : countryApp.data?.result;
  const detailWiki = selectedCountry === undefined ? wiki.data : countryWiki.data?.result;
  const appCountry = selectedCountry === undefined ? undefined : countryApp.data?.country;
  const wikiCountry = selectedCountry === undefined ? undefined : countryWiki.data?.country;
  const updateLocation = useCallback((next: AnalyzeLocation) => {
    const conditionsUrl = new URL(analyzeConditionsUrl(window.location.href, conditions), window.location.origin);
    window.history.replaceState(null, "", analyzeLocationUrl(conditionsUrl.href, next));
  }, [conditions]);
  const selectCountry = useCallback((country: string | null | undefined) => {
    updateLocation({ country, domestic: false });
  }, [updateLocation]);
  const forbidden = [app.data, wiki.data, detailApp, detailWiki].some(
    (result) => result?.status === "error" && result.httpStatus === 403,
  );
  const unauthorized = [app.data, wiki.data, detailApp, detailWiki].some(
    (result) => result?.status === "error" && result.httpStatus === 401,
  );
  const appReport = app.data?.status === "available" ? app.data.report : null;
  const wikiReport =
    wiki.data?.status === "available" ? wiki.data.report : null;
  const appDetailReport = detailApp?.status === "available" ? detailApp.report : null;
  const wikiDetailReport = detailWiki?.status === "available" ? detailWiki.report : null;
  const mapMetrics = useMemo<CountryGlobeMetric[]>(() => [
    ...(appReport ? (["applicationUsers", "registeredUsers"] as const).map((key) => ({
      key,
      name: t[key],
      group: t.app,
      report: appReport[key],
    })) : []),
    ...(wikiReport ? (["views", "viewers", "engagementTime", "submissions", "publications"] as const).map((key) => ({
      key,
      name: t[key],
      group: t.wiki,
      report: wikiReport[key],
      averageTime: key === "engagementTime",
    })) : []),
  ], [appReport, wikiReport, t]);
  const busy = app.isFetching || wiki.isFetching || countryWiki.isFetching || countryApp.isFetching;
  const refresh = () => {
    if (domesticCountry) { setRegionalRevision(revision => revision + 1); return; }
    void app.refetch();
    void wiki.refetch();
    if (selectedCountry !== undefined) {
      void countryWiki.refetch();
      void countryApp.refetch();
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: AnalyzeConditions = {
      from: String(data.get("from")),
      to: String(data.get("to")),
      translationSetIdentifier: String(data.get("target") ?? "").trim(),
      wikiName: String(data.get("wikiName") ?? "").trim(),
      language: String(data.get("language") ?? ""),
    };
    const error = analyzeConditionsError(next);
    setInvalid(error);
    if (error) return;
    // Native history updates the query without navigating or fetching Server Components.
    const url = analyzeConditionsUrl(window.location.href, next);
    const sameConditions = JSON.stringify(next) === JSON.stringify(conditions);
    window.history.replaceState(null, "", sameConditions ? url : analyzeLocationUrl(new URL(url, window.location.origin).href, { domestic: false }));
    if (sameConditions) refresh();
  };
  const inputClass =
    "mt-1 h-9 w-full min-w-0 rounded border border-stroke-subtle bg-surface-base px-2 py-1.5 text-sm";
  return (
    <section aria-label={t.title} className="min-w-0 space-y-5">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <form
        key={JSON.stringify(formConditions)}
        onSubmit={submit}
        className="grid min-w-0 grid-cols-2 items-end gap-x-3 gap-y-2 xl:grid-cols-[9.5rem_9.5rem_minmax(12rem,1fr)_7rem_auto]"
      >
        <label className="min-w-0 text-xs">
          {t.from}
          <input
            className={inputClass}
            name="from"
            type="date"
            required
            defaultValue={formConditions.from}
            max={latestReportingDay()}
          />
        </label>
        <label className="min-w-0 text-xs">
          {t.to}
          <input
            className={inputClass}
            name="to"
            type="date"
            required
            defaultValue={formConditions.to}
            max={latestReportingDay()}
          />
        </label>
        <AnalyzeWikiSelect label={t.target} disabled={busy} initialSelection={formConditions.translationSetIdentifier ? { translationSetIdentifier: formConditions.translationSetIdentifier, name: formConditions.wikiName || t.selectedWiki } : undefined} />
        <label className="min-w-0 text-xs">
          {t.language}
          <select
            className={inputClass}
            name="language"
            defaultValue={formConditions.language}
          >
            <option value="">{t.all}</option>
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-9 self-end whitespace-nowrap rounded-lg bg-brand-primary px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.apply}
        </button>
      </form>
      {location.invalid ? <AccountStatusMessage variant="error">{t.invalidRequest}</AccountStatusMessage> : null}
      {conditionsError ? <AccountStatusMessage variant="error">{conditionsError === "period" ? t.invalid : t.invalidRequest}</AccountStatusMessage> : null}
      {forbidden || unauthorized ? (
        <AccountStatusMessage variant="error">{unauthorized ? t.unauthorized : t.forbidden}</AccountStatusMessage>
      ) : (
        <>
          {mapMetrics.length ? (
            <div hidden={!!domesticCountry}>
            <CountryGlobe
              key={`${appQuery}:${wikiQuery}`}
              metrics={mapMetrics}
              initialCountry={typeof selectedCountry === "string" ? selectedCountry : initialCountry}
              countrySelection={globeSelection}
              onCountryChange={selectCountry}
              onDomesticView={(country) => updateLocation({ country, domestic: true })}
              t={t}
              locale={locale}
            />
            </div>
          ) : null}
          {domesticCountry ? (
            <DomesticAnalysis
              key={`${scope}:${version}:${wikiQuery}:${domesticCountry}`}
              country={domesticCountry}
              region={location.region}
              onRegionChange={(region) => updateLocation({ country: domesticCountry, region, domestic: true })}
              appQuery={appQuery}
              wikiQuery={wikiQuery}
              scope={scope}
              version={version}
              revision={regionalRevision}
              onBack={() => {
                updateLocation({ country: domesticCountry, domestic: false });
                requestAnimationFrame(() => {
                  document.querySelector<HTMLButtonElement>("[data-domestic-entry]")?.focus();
                });
              }}
              locale={locale}
              t={t}
            />
          ) : null}
          <div hidden={!!domesticCountry} className="space-y-5">
          <section aria-label={t.app} aria-busy={selectedCountry !== undefined && countryApp.isFetching} className="min-w-0 space-y-3">
            <h3 className="text-xl font-semibold">
              {t.app}
            </h3>
            {detailApp?.status === "error" ? (
              <AccountStatusMessage variant="error">
                {[400, 422].includes(detailApp.httpStatus) ? t.invalidRequest : t.httpError}
              </AccountStatusMessage>
            ) : null}
            {appDetailReport ? (
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                {(["applicationUsers", "registeredUsers"] as const).map(
                  (key) => (
                    <MetricCard
                      key={`${appQuery}:${key}`}
                      name={t[key]}
                      report={appDetailReport[key]}
                      country={appCountry}
                      totalLabel={
                        key === "registeredUsers" ? t.registeredUsers : t.total
                      }
                      t={t}
                      locale={locale}
                    />
                  ),
                )}
              </div>
            ) : null}
          </section>
          <section aria-label={t.wiki} aria-busy={selectedCountry !== undefined && countryWiki.isFetching} className="min-w-0 space-y-3">
            <h3 className="text-xl font-semibold">
              {t.wiki}
            </h3>
            {detailWiki?.status === "error" ? (
              <AccountStatusMessage variant="error">
                {[400, 422].includes(detailWiki.httpStatus) ? t.invalidRequest : t.httpError}
              </AccountStatusMessage>
            ) : null}
            {wikiDetailReport ? (
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                {(
                  [
                    "views",
                    "viewers",
                    "engagementTime",
                    "submissions",
                    "publications",
                  ] as const
                ).map((key) => (
                  <MetricCard
                    key={`${wikiQuery}:${key}`}
                    name={t[key]}
                    report={wikiDetailReport[key]}
                    country={wikiCountry}
                    t={t}
                    locale={locale}
                    averageTime={key === "engagementTime"}
                    showSubmitters={key === "submissions"}
                  />
                ))}
              </div>
            ) : null}
          </section>
          </div>
        </>
      )}
    </section>
  );
}
