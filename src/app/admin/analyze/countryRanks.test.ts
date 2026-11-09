import { describe, expect, it } from "vitest";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { metric } from "../../../../tests/fixtures/analyzeReports";
import { createCountryRanks } from "./countryRanks";

const row = (country: string | null, value: string | null, denominator: number | null = null) => ({
  country, value, denominator, quality: [],
});
const report = (countries: MetricReport["countries"]): MetricReport => ({ ...metric, days: [], countries });

describe("country ranks", () => {
  it("keeps large decimal-backed counts exact and uses competition ranks for ties", () => {
    const ranks = createCountryRanks(report([
      row("JP", "9007199254740993.000000000"),
      row("KR", "9007199254740992.000000000"),
      row("US", "9007199254740993"),
      row(null, "999999999999999999999"),
    ]));
    expect(ranks.get("JP")).toBe(1);
    expect(ranks.get("US")).toBe(1);
    expect(ranks.get("KR")).toBe(3);
    expect(ranks.size).toBe(3);
  });
  it("ranks average engagement rather than total time", () => {
    const ranks = createCountryRanks(report([
      row("JP", "100", 10), row("KR", "90", 3), row("US", "30", 3),
    ]), true);
    expect(ranks.get("KR")).toBe(1);
    expect(ranks.get("JP")).toBe(2);
    expect(ranks.get("US")).toBe(2);
  });
  it("compares average durations before display rounding", () => {
    const ranks = createCountryRanks(report([
      row("JP", "1.000000001", 2), row("KR", "1.000000000", 2),
    ]), true);
    expect(ranks.get("JP")).toBe(1);
    expect(ranks.get("KR")).toBe(2);
  });
  it("includes measured zeros and excludes missing or invalid values", () => {
    const ranks = createCountryRanks(report([
      row("JP", "0.000000000"), row("KR", "10"), row("IS", "0"),
      row("US", null), row("BR", "invalid"), row("CA", "-1"),
    ]));
    expect(Array.from(ranks)).toEqual([["KR", 1], ["JP", 2], ["IS", 2]]);
    expect(createCountryRanks(report([])).size).toBe(0);
  });
  it("does not rank average times without a usable denominator", () => {
    const ranks = createCountryRanks(report([
      row("JP", "0", 2), row("KR", "0", 0), row("US", "10", null),
    ]), true);
    expect(Array.from(ranks)).toEqual([["JP", 1]]);
  });
});
