"use client";
import { CountryMetricChart, DailyMetricChart } from "./MetricCharts";
import { memo, useId } from "react";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { formatMetricValue, metricValue } from "./reportPresentation";

function MetricCardView({
  name,
  report,
  t,
  locale,
  averageTime = false,
  showSubmitters = false,
  totalLabel,
  country,
}: {
  name: string;
  report: MetricReport;
  t: AnalyzeReportDictionary;
  locale: string;
  averageTime?: boolean;
  showSubmitters?: boolean;
  totalLabel?: string;
  country?: string | null;
}) {
  const id = useId();
  const format = (value: string | null | undefined, denominator: number | null) =>
    formatMetricValue(value, locale, { averageTime, denominator, seconds: t.seconds });
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
            <dd data-testid="metric-submitters" className="text-xl">
              {metricValue(report.actorCount, locale)}
            </dd>
          </div>
        ) : null}
      </dl>
      <details>
        <summary className="cursor-pointer text-sm text-text-muted">
          {t.details}
        </summary>
        <div className="mt-4 space-y-4">
          {country === undefined ? <div>
            <h5 className="font-semibold">{t.countries}</h5>
            <CountryMetricChart name={name} report={report} t={t} locale={locale} averageTime={averageTime} showSubmitters={showSubmitters} />
          </div> : null}
          <div>
            <h5 className="font-semibold">{t.trend}</h5>
            <DailyMetricChart name={name} report={report} t={t} locale={locale} averageTime={averageTime} showSubmitters={showSubmitters} />
          </div>
        </div>
      </details>
    </section>
  );
}

export const MetricCard = memo(MetricCardView);
