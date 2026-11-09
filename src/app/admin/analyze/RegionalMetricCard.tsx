"use client";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { RegionalMetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { DailyMetricChart } from "./MetricCharts";
import { regionName } from "./regionPresentation";
import { regionBoundary } from "./regionalProjection";
import { chartValue } from "./chartPresentation";
import { formatMetricValue, metricValue } from "./reportPresentation";
export function RegionalMetricCard({
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
}: {
  name: string;
  report: RegionalMetricReport;
  t: AnalyzeReportDictionary;
  locale: string;
  averageTime?: boolean;
  showSubmitters?: boolean;
  onSelect: (region: string | null) => void;
  selectedRegion?: string | null;
  country?: string;
  level?: string;
  totalLabel?: string;
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
  const rows = report.regions
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
      number: chartValue(row.value, row.denominator, averageTime),
    }));
  return (
    <section
      aria-label={name}
      className="min-w-0 space-y-3 rounded-xl border border-stroke-subtle bg-surface-base p-4"
    >
      <h4 className="text-lg font-semibold">{name}</h4>
      <dl className="flex flex-wrap gap-6">
        <div>
          <dt>{totalLabel ?? (averageTime ? t.average : t.total)}</dt>
          <dd
            data-testid="metric-total"
            className="break-all text-2xl font-semibold"
          >
            {format(report.total, report.denominator)}
          </dd>
        </div>
        {showSubmitters ? (
          <div>
            <dt>{t.submitters}</dt>
            <dd data-testid="metric-submitters">
              {metricValue(report.actorCount, locale)}
            </dd>
          </div>
        ) : null}
      </dl>
      <details>
        <summary className="cursor-pointer text-sm">{t.details}</summary>
        {selectedRegion === undefined ? (
          <section
            aria-label={`${name}: ${t.regions}`}
            className="mt-3 space-y-3"
          >
            <h5 className="font-semibold">{t.regions}</h5>
            {!rows.length ? (
              <p>{t.noRegions}</p>
            ) : (
              <>
                <div className="max-h-96 overflow-auto">
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(180, rows.length * 32)}
                    minWidth={0}
                    initialDimension={{ width: 400, height: 240 }}
                  >
                    <BarChart
                      data={rows}
                      layout="vertical"
                      margin={{ left: 0, right: 12 }}
                      accessibilityLayer
                    >
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        content={({ active, activeIndex }) => {
                          const row = rows[Number(activeIndex)];
                          return active && row ? (
                            <p className="rounded border border-stroke-subtle bg-surface-base p-2">
                              {row.label}: {format(row.value, row.denominator)}
                            </p>
                          ) : null;
                        }}
                      />
                      <Bar
                        dataKey="number"
                        fill="#0d9488"
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="max-h-80 space-y-1 overflow-auto text-sm">
                  {rows.map((row) => (
                    <li key={row.region ?? "unknown"}>
                      <button
                        type="button"
                        onClick={() => onSelect(row.region)}
                        className="flex w-full items-center justify-between gap-2 rounded p-2 text-left focus-visible:outline-2 focus-visible:outline-brand-primary"
                      >
                        <span>
                          {row.label}
                          {row.region &&
                          (!row.mapSupported || !regionBoundary(row.region))
                            ? ` · ${t.unmappedRegion}`
                            : ""}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {format(row.value, row.denominator)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : null}
        <h5 className="mt-4 font-semibold">{t.trend}</h5>
        <DailyMetricChart
          name={name}
          report={report}
          t={t}
          locale={locale}
          averageTime={averageTime}
          showSubmitters={showSubmitters}
        />
        <ul className="max-h-36 overflow-auto text-xs text-text-muted">
          {report.days
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
