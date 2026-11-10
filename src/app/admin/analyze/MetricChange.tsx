import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { metricChange, type ComparisonPeriod } from "./endpointComparison";

export function MetricChange({ days, period, averageTime = false, actorCount = false, t, locale }: {
  days?: MetricReport["days"];
  period?: ComparisonPeriod;
  averageTime?: boolean;
  actorCount?: boolean;
  t: AnalyzeReportDictionary;
  locale: string;
}) {
  if (!period || averageTime) return null;
  const change = days ? metricChange(days, period, { averageTime, actorCount }) : null;
  const rounded = change === null ? null : Math.round(change * 10) / 10;
  const value = rounded === null ? t.changeUnavailable : `${rounded.toLocaleString(locale, {
    maximumFractionDigits: 1, signDisplay: "exceptZero",
  })}%`;
  const description = `${t.endpointChange} (${t.day}): ${period.from} → ${period.to}`;
  const direction = rounded === null || rounded === 0 ? "flat" : rounded > 0 ? "up" : "down";
  const TrendIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : ArrowRight;
  return (
    <span
      title={description}
      aria-label={`${description}: ${value}`}
      className={`ml-2 inline-flex items-center gap-1 align-middle text-sm font-medium tabular-nums ${direction === "up" ? "text-status-success" : direction === "down" ? "text-status-danger" : "text-text-muted"}`}
    >
      {rounded !== null ? (
        <TrendIcon size={18} aria-hidden="true" />
      ) : null}
      {value}
    </span>
  );
}
