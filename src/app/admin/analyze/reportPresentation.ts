import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";

export const metricValue = (
  value: string | null | undefined,
  locale: string,
) => {
  if (value == null) return "—";
  const integer = value.match(/^(-?\d+)(?:\.0+)?$/)?.[1];
  if (integer !== undefined) return BigInt(integer).toLocaleString(locale);
  return value;
};
export const countryName = (
  code: string | null,
  locale: string,
  t: AnalyzeReportDictionary,
) =>
  code === null
    ? t.unknown
    : /^[A-Z]{2}$/.test(code)
      ? `${new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code} (${code})`
      : code;

export const averageEngagementSeconds = (
  total: string | null | undefined,
  denominator: number | null | undefined,
): number | null => {
  if (
    total == null || !total.trim() || denominator == null ||
    !Number.isSafeInteger(denominator) || denominator <= 0
  ) return null;
  const seconds = Number(total);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds / denominator : null;
};

export const formatMetricValue = (
  value: string | null | undefined,
  locale: string,
  { averageTime = false, denominator, seconds }: {
    averageTime?: boolean;
    denominator?: number | null;
    seconds: string;
  },
) => {
  if (!averageTime) return metricValue(value, locale);
  const average = averageEngagementSeconds(value, denominator);
  return average === null ? "—"
    : `${average.toLocaleString(locale, { maximumFractionDigits: 2 })} ${seconds}`;
};
