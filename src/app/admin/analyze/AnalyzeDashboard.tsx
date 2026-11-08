"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAnalyzeReport } from "@/gateways/analyze/analyzeReports";
import { useAdmin } from "../AdminProvider";
import { latestReportingDay, validReportingPeriod } from "./reportingPeriod";
import { MetricCard } from "./MetricCard";

type Conditions = {
  from: string;
  to: string;
  translationSetIdentifier: string;
  language: string;
  country: string;
};
const defaults = (): Conditions => {
  const to = latestReportingDay();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 27);
  return {
    from: from.toISOString().slice(0, 10),
    to,
    translationSetIdentifier: "",
    language: "",
    country: "",
  };
};
export function AnalyzeDashboard({
  scope,
  version,
}: {
  scope: string;
  version: number;
}) {
  const {
    locale,
    t: {
      analyze: { report: t },
    },
  } = useAdmin();
  const [conditions, setConditions] = useState(defaults);
  const [invalid, setInvalid] = useState(false);
  const appQuery = new URLSearchParams({
    from: conditions.from,
    to: conditions.to,
  }).toString();
  const wikiParams = new URLSearchParams({
    from: conditions.from,
    to: conditions.to,
  });
  for (const key of [
    "translationSetIdentifier",
    "language",
    "country",
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
  const forbidden = [app.data, wiki.data].some(
    (result) => result?.status === "error" && result.httpStatus === 403,
  );
  const unauthorized = [app.data, wiki.data].some(
    (result) => result?.status === "error" && result.httpStatus === 401,
  );
  const appReport = app.data?.status === "available" ? app.data.report : null;
  const wikiReport =
    wiki.data?.status === "available" ? wiki.data.report : null;
  const busy = app.isFetching || wiki.isFetching;
  const refresh = () => {
    void app.refetch();
    void wiki.refetch();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Conditions = {
      from: String(data.get("from")),
      to: String(data.get("to")),
      translationSetIdentifier: String(data.get("target") ?? "").trim(),
      language: String(data.get("language") ?? ""),
      country: String(data.get("country") ?? "").trim(),
    };
    next.country =
      next.country.toLowerCase() === "unknown"
        ? "unknown"
        : next.country.toUpperCase();
    const valid =
      validReportingPeriod(next.from, next.to) &&
      (!next.translationSetIdentifier ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          next.translationSetIdentifier,
        )) &&
      (!next.country || /^(?:[A-Z]{2}|unknown)$/.test(next.country));
    setInvalid(!valid);
    if (!valid) return;
    if (JSON.stringify(next) === JSON.stringify(conditions)) refresh();
    else setConditions(next);
  };
  const inputClass =
    "mt-1 w-full rounded border border-stroke-subtle bg-surface-base p-2";
  return (
    <section aria-label={t.title} className="min-w-0 space-y-5">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="text-sm">{t.periodRule}</p>
      <form
        onSubmit={submit}
        className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label>
          {t.from}
          <input
            className={inputClass}
            name="from"
            type="date"
            required
            defaultValue={conditions.from}
            max={latestReportingDay()}
          />
        </label>
        <label>
          {t.to}
          <input
            className={inputClass}
            name="to"
            type="date"
            required
            defaultValue={conditions.to}
            max={latestReportingDay()}
          />
        </label>
        <label className="min-w-0">
          {t.target}
          <input
            className={inputClass}
            name="target"
            defaultValue={conditions.translationSetIdentifier}
            placeholder="UUID"
          />
        </label>
        <label>
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
        <label>
          {t.country}
          <input
            className={inputClass}
            name="country"
            defaultValue={conditions.country}
            list="analyze-country-options"
            placeholder="JP / KR / unknown"
          />
        </label>
        <datalist id="analyze-country-options">
          <option value="unknown">{t.unknown}</option>
          <option value="JP" />
          <option value="KR" />
          <option value="US" />
        </datalist>
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {t.apply}
        </button>
      </form>
      {invalid ? <p role="alert">{t.invalid}</p> : null}
      <p className="text-sm">{t.scopeNote}</p>
      <p>
        {conditions.from} – {conditions.to}
      </p>
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="rounded border border-stroke-subtle px-4 py-2 disabled:opacity-50"
      >
        {t.refresh}
      </button>
      {busy ? <p role="status">{t.loading}</p> : null}
      {forbidden || unauthorized ? (
        <p role="alert">{unauthorized ? t.unauthorized : t.forbidden}</p>
      ) : (
        <>
          <p className="text-sm text-text-muted">{t.partial}</p>
          <p className="text-sm text-text-muted">{t.nullNote}</p>
          <section aria-label={t.app} className="min-w-0 space-y-3">
            <h3 className="text-xl font-semibold">{t.app}</h3>
            <p className="text-sm">{t.appDefinition}</p>
            {app.data?.status === "error" ? (
              <p role="alert">
                {t.httpError} ({app.data.httpStatus}){" "}
                {[400, 422].includes(app.data.httpStatus)
                  ? t.invalidRequest
                  : ""}
              </p>
            ) : null}
            {appReport ? (
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                {(["applicationUsers", "registeredUsers"] as const).map(
                  (key) => (
                    <MetricCard
                      key={`${appQuery}:${key}`}
                      name={t[key]}
                      report={appReport[key]}
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
          <section aria-label={t.wiki} className="min-w-0 space-y-3">
            <h3 className="text-xl font-semibold">{t.wiki}</h3>
            <p className="text-sm">{t.wikiDefinition}</p>
            {wiki.data?.status === "error" ? (
              <p role="alert">
                {t.httpError} ({wiki.data.httpStatus}){" "}
                {[400, 422].includes(wiki.data.httpStatus)
                  ? t.invalidRequest
                  : ""}
              </p>
            ) : null}
            {wikiReport ? (
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
                    report={wikiReport[key]}
                    t={t}
                    locale={locale}
                    time={key === "engagementTime"}
                    actors={key === "submissions" || key === "publications"}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}
