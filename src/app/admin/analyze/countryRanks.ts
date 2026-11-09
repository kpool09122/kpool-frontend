import type { MetricReport } from "@/gateways/analyze/analyzeReports";

type Fraction = { numerator: bigint; denominator: bigint };

const comparableValue = (
  row: MetricReport["countries"][number],
  averageTime: boolean,
): Fraction | null => {
  const match = row.value?.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  let samples = BigInt(1);
  if (averageTime) {
    if (row.denominator == null || !Number.isSafeInteger(row.denominator) || row.denominator <= 0)
      return null;
    samples = BigInt(row.denominator);
  }
  const decimal = match[2] ?? "";
  return {
    numerator: BigInt(match[1] + decimal),
    denominator: BigInt(10) ** BigInt(decimal.length) * samples,
  };
};

// Keep large counts exact and compare average durations before display rounding.
const compare = (a: Fraction, b: Fraction) => {
  const left = a.numerator * b.denominator;
  const right = b.numerator * a.denominator;
  return left > right ? 1 : left < right ? -1 : 0;
};

export const createCountryRanks = (report: MetricReport, averageTime = false): Map<string, number> => {
  const countries = report.countries.flatMap((row) => {
    if (!row.country) return [];
    const value = comparableValue(row, averageTime);
    return value ? [{ country: row.country, value }] : [];
  }).sort((a, b) => compare(b.value, a.value));
  const ranks = new Map<string, number>();
  let rank = 0;
  for (const [index, item] of countries.entries()) {
    const previous = countries[index - 1];
    if (!previous || compare(previous.value, item.value) !== 0) rank = index + 1;
    ranks.set(item.country, rank);
  }
  return ranks;
};
