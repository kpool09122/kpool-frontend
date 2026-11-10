"use client";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountStatusMessage } from "@/components/Account";
import { getAnalyzeReport } from "@/gateways/analyze/analyzeReports";
import { useAdmin } from "../AdminProvider";
import {
  defaultReportingPeriod,
  latestLocalReportingDay,
  toUtcReportingDay,
  validReportingPeriod,
} from "./reportingPeriod";
import { AnalyzeWikiSelect } from "./AnalyzeWikiSelect";
import { CountryGlobe } from "./CountryGlobe";
import type { CountryGlobeMetric } from "./countryColorScale";
import { MetricCard } from "./MetricCard";
import { useCountryReport } from "./useCountryReport";
import { DomesticAnalysis } from "./DomesticAnalysis";

type Conditions = {
  from: string;
  to: string;
  translationSetIdentifier: string;
  language: string;
};
const defaults = (): Conditions => ({
  ...defaultReportingPeriod(),
  translationSetIdentifier: "",
  language: "",
});
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
  const [conditions, setConditions] = useState(defaults);
  const [invalid, setInvalid] = useState(false);
  const [domesticCountry, setDomesticCountry] = useState<string>();
  const [regionalRevision, setRegionalRevision] = useState(0);
  const [countrySelection, setCountrySelection] = useState<{ query: string; country: string | null }>();
  const period = useMemo(() => ({
    from: toUtcReportingDay(conditions.from),
    to: toUtcReportingDay(conditions.to),
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
  const selectedCountry = countrySelection?.query === wikiQuery ? countrySelection.country : undefined;
  const countryWiki = useCountryReport({ kind: "wiki", query: wikiQuery, scope, version, country: selectedCountry, globalResult: wiki.data });
  const countryApp = useCountryReport({ kind: "app", query: appQuery, scope, version, country: selectedCountry, globalResult: app.data });
  const detailApp = selectedCountry === undefined ? app.data : countryApp.data?.result;
  const detailWiki = selectedCountry === undefined ? wiki.data : countryWiki.data?.result;
  const appCountry = selectedCountry === undefined ? undefined : countryApp.data?.country;
  const wikiCountry = selectedCountry === undefined ? undefined : countryWiki.data?.country;
  const selectCountry = useCallback((country: string | null | undefined) => {
    setCountrySelection((current) => {
      if (country === undefined) return undefined;
      return current?.query === wikiQuery && current.country === country ? current : { query: wikiQuery, country };
    });
  }, [wikiQuery]);
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
    const next: Conditions = {
      from: String(data.get("from")),
      to: String(data.get("to")),
      translationSetIdentifier: String(data.get("target") ?? "").trim(),
      language: String(data.get("language") ?? ""),
    };
    const valid =
      validReportingPeriod(
        toUtcReportingDay(next.from),
        toUtcReportingDay(next.to),
      ) &&
      (!next.translationSetIdentifier ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          next.translationSetIdentifier,
        ));
    setInvalid(!valid);
    if (!valid) return;
    if (JSON.stringify(next) === JSON.stringify(conditions)) refresh();
    else {
      setDomesticCountry(undefined);
      setCountrySelection(undefined);
      setConditions(next);
    }
  };
  const inputClass =
    "mt-1 h-9 w-full min-w-0 rounded border border-stroke-subtle bg-surface-base px-2 py-1.5 text-sm";
  return (
    <section aria-label={t.title} className="min-w-0 space-y-5">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <form
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
            defaultValue={conditions.from}
            max={latestLocalReportingDay()}
          />
        </label>
        <label className="min-w-0 text-xs">
          {t.to}
          <input
            className={inputClass}
            name="to"
            type="date"
            required
            defaultValue={conditions.to}
            max={latestLocalReportingDay()}
          />
        </label>
        <AnalyzeWikiSelect label={t.target} disabled={busy} />
        <label className="min-w-0 text-xs">
          {t.language}
          <select
            className={inputClass}
            name="language"
            defaultValue={conditions.language}
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
      {invalid ? <AccountStatusMessage variant="error">{t.invalid}</AccountStatusMessage> : null}
      {forbidden || unauthorized ? (
        <AccountStatusMessage variant="error">{unauthorized ? t.unauthorized : t.forbidden}</AccountStatusMessage>
      ) : (
        <>
          {mapMetrics.length ? (
            <div hidden={!!domesticCountry}>
            <CountryGlobe
              key={`${appQuery}:${wikiQuery}`}
              metrics={mapMetrics}
              initialCountry={initialCountry}
              onCountryChange={selectCountry}
              onDomesticView={setDomesticCountry}
              t={t}
              locale={locale}
            />
            </div>
          ) : null}
          {domesticCountry ? <DomesticAnalysis period={period} key={`${scope}:${version}:${wikiQuery}:${domesticCountry}`} country={domesticCountry} appQuery={appQuery} wikiQuery={wikiQuery} scope={scope} version={version} revision={regionalRevision} onBack={() => { setDomesticCountry(undefined); requestAnimationFrame(() => { document.querySelector<HTMLButtonElement>("[data-domestic-entry]")?.focus(); }); }} locale={locale} t={t} /> : null}
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
                      period={period}
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
                    period={period}
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
