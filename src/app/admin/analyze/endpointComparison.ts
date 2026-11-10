import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { averageEngagementSeconds } from "./reportPresentation";

export type ComparisonPeriod = { from: string; to: string };

// Compare the requested endpoints, never substitute a nearby measured day.
export function metricChange(
  days: MetricReport["days"],
  { from, to }: ComparisonPeriod,
  { averageTime = false, actorCount = false } = {},
): number | null {
  const start = days.find((day) => day.day === from);
  const end = days.find((day) => day.day === to);
  if (!start || !end || [start, end].some((day) =>
    day.availability !== "measured" || day.quality.length > 0,
  )) return null;

  if (averageTime && !actorCount) {
    const first = averageEngagementSeconds(start.value, start.denominator);
    const last = averageEngagementSeconds(end.value, end.denominator);
    if (first === null || last === null || first === 0) return null;
    const change = (last - first) / first * 100;
    return Number.isFinite(change) ? change : null;
  }

  const integer = (value: string | null | undefined) => {
    const match = value?.match(/^(\d+)(?:\.0+)?$/);
    return match ? BigInt(match[1]) : null;
  };
  const first = integer(actorCount ? start.actorCount : start.value);
  const last = integer(actorCount ? end.actorCount : end.value);
  if (first === null || last === null || first === BigInt(0)) return null;
  const delta = last - first;
  // Round to a tenth of a percent without losing precision on large counts.
  const magnitude = delta < BigInt(0) ? -delta : delta;
  const tenths = (magnitude * BigInt(1000) + first / BigInt(2)) / first;
  const change = Number(tenths) / 10 * (delta < BigInt(0) ? -1 : 1);
  return Number.isFinite(change) ? change : null;
}
