import { averageEngagementSeconds } from "./reportPresentation";

export const chartValue = (value: string | null, denominator: number | null, averageTime: boolean) => {
  if (averageTime) return averageEngagementSeconds(value, denominator);
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function trendDomain(values: (number | null)[], decimals = false): [number, number] {
  const measured = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!measured.length) return [0, 1];
  const min = Math.min(...measured);
  const max = Math.max(...measured);
  const padding = max > min ? (max - min) * 0.15 : Math.max(max * 0.05, decimals ? 0.1 : 1);
  const lower = Math.max(0, min - padding);
  const upper = max + padding;
  return decimals ? [lower, upper] : [Math.floor(lower), Math.ceil(upper)];
}

// Consistent, restrained colors shared by sectors, bars and their legends.
export const chartColors = ["#0d9488", "#3b82f6", "#6366f1", "#8b5cf6", "#d97706", "#0891b2", "#64748b", "#059669"];
