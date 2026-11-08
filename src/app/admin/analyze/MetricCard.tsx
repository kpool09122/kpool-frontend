"use client";
import { useId } from "react";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { CountryMap, countryName, metricValue } from "./CountryMap";

export function MetricCard({
  name,
  report,
  t,
  locale,
  time = false,
  actors = false,
  totalLabel,
}: {
  name: string;
  report: MetricReport;
  t: AnalyzeReportDictionary;
  locale: string;
  time?: boolean;
  actors?: boolean;
  totalLabel?: string;
}) {
  const id = useId();
  const format = (value: string | null | undefined) =>
    metricValue(value, locale, time) +
    (time && value != null ? ` ${t.seconds}` : "");
  const tableClass =
    "w-full text-left text-sm [&_th]:whitespace-nowrap [&_th]:p-2 [&_td]:p-2 [&_tr]:border-b [&_tr]:border-stroke-subtle";
  return (
    <section
      aria-labelledby={id}
      className="min-w-0 space-y-3 rounded-xl border border-stroke-subtle bg-surface-base p-4"
    >
      <h4 id={id} className="text-lg font-semibold">
        {name}
      </h4>
      <dl className="flex flex-wrap gap-6">
        <div>
          <dt>{totalLabel ?? t.total}</dt>
          <dd
            data-testid="metric-total"
            className="break-all text-2xl font-semibold"
          >
            {format(report.total)}
          </dd>
        </div>
        {actors ? (
          <div>
            <dt>{t.actors}</dt>
            <dd data-testid="metric-actors" className="text-xl">
              {metricValue(report.actorCount, locale)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{t.denominator}</dt>
          <dd>{report.denominator ?? "—"}</dd>
        </div>
      </dl>
      <details>
        <summary className="cursor-pointer">{t.definition}</summary>
        <dl className="break-words text-sm">
          {Object.entries(report.definition)
            .filter(([, value]) => typeof value === "string")
            .map(([key, value]) => (
              <div key={key}>
                <dt className="inline">{key}: </dt>
                <dd className="inline">{String(value)}</dd>
              </div>
            ))}
          <div>
            <dt className="inline">revision: </dt>
            <dd className="inline">{report.revision ?? "—"}</dd>
          </div>
        </dl>
      </details>
      <CountryMap
        report={report}
        t={t}
        locale={locale}
        time={time}
        actors={actors}
      />
      <details>
        <summary className="cursor-pointer">{t.countries}</summary>
        <div
          className="max-w-full overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={`${name}: ${t.countries}`}
        >
          <table className={tableClass}>
            <caption className="sr-only">
              {name}: {t.countries}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t.country}</th>
                <th scope="col">{t.value}</th>
                {actors ? <th scope="col">{t.countryActors}</th> : null}
                <th scope="col">{t.denominator}</th>
                <th scope="col">{t.quality}</th>
              </tr>
            </thead>
            <tbody>
              {report.countries.map((row) => (
                <tr key={row.country ?? "unknown"}>
                  <th scope="row">{countryName(row.country, locale, t)}</th>
                  <td>{format(row.value)}</td>
                  {actors ? (
                    <td>{metricValue(row.actorCount, locale)}</td>
                  ) : null}
                  <td>{row.denominator ?? "—"}</td>
                  <td>{row.quality.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.countries.length ? <p>{t.noCountries}</p> : null}
        </div>
      </details>
      <div
        className="max-w-full overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`${name}: ${t.trend}`}
      >
        <table className={tableClass}>
          <caption className="text-left font-semibold">{t.trend}</caption>
          <thead>
            <tr>
              <th scope="col">{t.day}</th>
              <th scope="col">{t.value}</th>
              {actors ? <th scope="col">{t.dailyActors}</th> : null}
              <th scope="col">{t.availability}</th>
              <th scope="col">{t.quality}</th>
              <th scope="col">{t.denominator}</th>
              <th scope="col">{t.updated}</th>
            </tr>
          </thead>
          <tbody>
            {report.days.map((day) => (
              <tr key={day.day}>
                <th scope="row">{day.day}</th>
                <td>{format(day.value)}</td>
                {actors ? <td>{metricValue(day.actorCount, locale)}</td> : null}
                <td>{t[day.availability]}</td>
                <td>{day.quality.join(", ") || "—"}</td>
                <td>{day.denominator ?? "—"}</td>
                <td>{day.updatedAt ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!report.days.length ? <p>{t.noDays}</p> : null}
      </div>
    </section>
  );
}
