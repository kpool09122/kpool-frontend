import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";

export function MetricChange({ comparison, actorCount = false, t, locale }: {
  comparison?: MetricReport["comparison"];
  actorCount?: boolean;
  t: AnalyzeReportDictionary;
  locale: string;
}) {
  if (!comparison) return null;
  const rate = actorCount ? comparison.actorPercentageChange : comparison.percentageChange;
  const reason = actorCount ? comparison.actorReason : comparison.reason;
  if (reason === "not_applicable") return null;
  const change = rate === null ? null : Number(rate);
  const percentage = change !== null && Number.isFinite(change) ? change : null;
  const reasonText = reason === "zero_baseline" ? t.zeroBaseline
    : reason === "invalid_denominator" ? t.invalidDenominator
      : reason === "no_previous_data" ? t.previousPeriodNoData : t.currentPeriodNoData;
  const value = percentage === null ? reasonText : `${percentage.toLocaleString(locale, {
    maximumFractionDigits: 1, signDisplay: "exceptZero",
  })}%`;
  const description = `${t.previousPeriod} (${t.day}): ${comparison.from} → ${comparison.to}${percentage === null ? ` · ${reasonText}` : ""}`;
  const direction = percentage === null || percentage === 0 ? "flat" : percentage > 0 ? "up" : "down";
  const TrendIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : ArrowRight;
  return (
    <span
      title={description}
      aria-label={`${description}: ${value}`}
      className={`ml-2 inline-flex items-center gap-1 align-middle ${percentage === null ? "text-xs" : "text-sm"} font-medium tabular-nums ${direction === "up" ? "text-status-success" : direction === "down" ? "text-status-danger" : "text-text-muted"}`}
    >
      {percentage !== null ? <span className="text-xs text-text-muted">{t.previousPeriod}</span> : null}
      {percentage !== null ? (
        <TrendIcon size={18} aria-hidden="true" />
      ) : null}
      {value}
    </span>
  );
}
