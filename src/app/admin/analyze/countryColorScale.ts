import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { averageEngagementSeconds } from "./reportPresentation";

export const overallMetricKey = "overall";
export type CountryGlobeMetric = {
  key: string;
  name: string;
  group: string;
  report: MetricReport;
  averageTime?: boolean;
};

const countryValues = (metric: CountryGlobeMetric) => {
  const values = new Map<string, number>();
  for (const row of metric.report.countries) {
    if (!row.country || row.value == null || !row.value.trim()) continue;
    const value = metric.averageTime
      ? averageEngagementSeconds(row.value, row.denominator) : Number(row.value);
    if (value != null && Number.isFinite(value) && value >= 0) values.set(row.country, value);
  }
  return values;
};

export const createCountryColorScale = (
  metrics: readonly CountryGlobeMetric[],
  selectedKey: string,
): Map<string, number> => {
  if (selectedKey !== overallMetricKey) {
    const metric = metrics.find((item) => item.key === selectedKey) ?? metrics[0];
    if (!metric) return new Map();
    const values = countryValues(metric);
    const maximum = Math.max(1, ...Array.from(values.values(), (value) => Math.log1p(value)));
    return new Map(Array.from(values, ([country, value]) => [country, Math.log1p(value) / maximum]));
  }

  // Equal weights after normalizing each metric by its own country maximum.
  // Missing metrics are excluded; known zero remains a real contribution.
  const scores = new Map<string, { sum: number; count: number }>();
  for (const metric of metrics) {
    const values = countryValues(metric);
    const maximum = Math.max(0, ...values.values());
    for (const [country, value] of values) {
      const score = scores.get(country) ?? { sum: 0, count: 0 };
      score.sum += maximum > 0 ? value / maximum : 0;
      score.count++;
      scores.set(country, score);
    }
  }
  return new Map(Array.from(scores, ([country, score]) => [country, score.sum / score.count]));
};
