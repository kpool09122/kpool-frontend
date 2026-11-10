"use client";
import { memo, useMemo } from "react";
import type { RegionalMetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { BreakdownMetricChart, DailyMetricChart } from "./MetricCharts";
import { regionName } from "./regionPresentation";
import { regionBoundary } from "./regionalProjection";
import { isSelectableRegion } from "./regionalSelection";
import { formatMetricValue, metricValue } from "./reportPresentation";
import { MetricChange } from "./MetricChange";
import type { ComparisonPeriod } from "./endpointComparison";

function RegionalMetricCardView({
  name,
  report,
  t,
  locale,
  averageTime = false,
  showSubmitters = false,
  onSelect,
  selectedRegion,
  country,
  level = "area",
  totalLabel,
  period,
}: {
  name: string;
  report?: RegionalMetricReport;
  t: AnalyzeReportDictionary;
  locale: string;
  averageTime?: boolean;
  showSubmitters?: boolean;
  onSelect: (region: string | null) => void;
  selectedRegion?: string | null;
  country?: string;
  level?: string;
  totalLabel?: string;
  period?: ComparisonPeriod;
}) {
  const format = (
    value: string | null | undefined,
    denominator: number | null,
  ) =>
    formatMetricValue(value, locale, {
      averageTime,
      denominator,
      seconds: t.seconds,
    });
  const rows = useMemo(() => (selectedRegion === undefined ? report?.regions ?? [] : [])
    .filter((row) => isSelectableRegion(country, row.region))
    .filter(
      (row) =>
        country !== "PH" ||
        !row.region ||
        !regionBoundary(row.region) ||
        regionBoundary(row.region)?.level === level,
    )
    .map((row) => ({
      ...row,
      label: regionName(row.region, locale, t),
      key: row.region,
    })), [report, selectedRegion, country, level, locale, t]);
  return (
    <section
      aria-label={name}
      aria-busy={!report}
      className="min-w-0 space-y-3 rounded-xl border border-stroke-subtle bg-surface-base p-4"
    >
      <h4 className="text-lg font-semibold">{name}</h4>
      <dl className="flex flex-wrap gap-6">
        <div>
          <dt>{totalLabel ?? (averageTime ? t.average : t.total)}</dt>
          <dd
            className="break-all text-2xl font-semibold"
          >
            <span data-testid="metric-total">{format(report?.total, report?.denominator ?? null)}</span>
            <MetricChange days={report?.days} period={period} averageTime={averageTime} t={t} locale={locale} />
          </dd>
        </div>
        {showSubmitters ? (
          <div>
            <dt>{t.submitters}</dt>
            <dd>
              <span data-testid="metric-submitters">{metricValue(report?.actorCount, locale)}</span>
              <MetricChange days={report?.days} period={period} actorCount t={t} locale={locale} />
            </dd>
          </div>
        ) : null}
      </dl>
      <details>
        <summary className="cursor-pointer text-sm">{t.details}</summary>
        {selectedRegion === undefined && report ? (
          <div className="mt-3 space-y-3">
            <h5 className="font-semibold">{t.regions}</h5>
            <BreakdownMetricChart
              name={name}
              rows={rows.map((row) => ({
                ...row,
                label: row.region && (!row.mapSupported || !regionBoundary(row.region))
                  ? `${row.label} · ${t.unmappedRegion}`
                  : row.label,
              }))}
              label={t.regions}
              emptyMessage={t.noRegions}
              t={t}
              locale={locale}
              averageTime={averageTime}
              showSubmitters={showSubmitters}
              onSelect={onSelect}
            />
          </div>
        ) : null}
        <h5 className="mt-4 font-semibold">{t.trend}</h5>
        {report ? <DailyMetricChart
          name={name}
          report={report}
          t={t}
          locale={locale}
          averageTime={averageTime}
          showSubmitters={showSubmitters}
        /> : <div className="mt-4 h-[260px] animate-pulse rounded bg-surface-raised" aria-hidden="true" />}
        <ul className="max-h-36 overflow-auto text-xs text-text-muted">
          {report?.days
            .filter((day) => day.availability !== "measured")
            .map((day) => (
              <li key={day.day}>
                {day.day}: {t[day.availability]}
              </li>
            ))}
        </ul>
      </details>
    </section>
  );
}

export const RegionalMetricCard = memo(RegionalMetricCardView);
