import { describe, expect, it } from "vitest";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { metric } from "../../../../tests/fixtures/analyzeReports";
import { createCountryColorScale, overallMetricKey, type CountryGlobeMetric } from "./countryColorScale";

const report = (key: string, countries: MetricReport["countries"], averageTime = false): CountryGlobeMetric => ({
  key, name: key, group: "Wiki", averageTime, report: { ...metric, days: [], countries },
});
const row = (country: string, value: string | null, denominator: number | null = null) => ({
  country, value, denominator, quality: [],
});

describe("country coloring", () => {
  it("combines metrics with equal weights independently of their units", () => {
    const counts = report("views", [row("JP", "1000000"), row("KR", "500000")]);
    const seconds = report("engagementTime", [row("JP", "50", 10), row("KR", "100", 10)], true);
    const colors = createCountryColorScale([counts, seconds], overallMetricKey);
    expect(colors.get("JP")).toBe(0.75);
    expect(colors.get("KR")).toBe(0.75);
    const milliseconds = report("engagementTime", [row("JP", "50000", 10), row("KR", "100000", 10)], true);
    expect(createCountryColorScale([counts, milliseconds], overallMetricKey)).toEqual(colors);
  });
  it("uses average engagement time rather than total duration", () => {
    const counts = report("views", [row("JP", "10"), row("KR", "5")]);
    const time = report("engagementTime", [row("JP", "20", 2), row("KR", "100", 20)], true);
    const colors = createCountryColorScale([counts, time], overallMetricKey);
    expect(colors.get("JP")).toBe(1);
    expect(colors.get("KR")).toBe(0.5);
  });
  it("keeps known zero distinct from missing or absent data", () => {
    const counts = report("views", [row("JP", "0"), row("KR", null)]);
    const time = report("engagementTime", [row("JP", "20", null), row("KR", "0", 0)], true);
    const colors = createCountryColorScale([counts, time], overallMetricKey);
    expect(colors.get("JP")).toBe(0);
    expect(colors.has("KR")).toBe(false);
    expect(colors.has("US")).toBe(false);
    expect(createCountryColorScale([], overallMetricKey).size).toBe(0);
  });
  it("uses only available metrics and supports switching to a single metric", () => {
    const counts = report("views", [row("JP", "10"), row("KR", "0")]);
    const time = report("engagementTime", [row("JP", "20", null)], true);
    expect(createCountryColorScale([counts, time], overallMetricKey).get("JP")).toBe(1);
    const individual = createCountryColorScale([counts, time], "views");
    expect(individual.get("JP")).toBe(1);
    expect(individual.get("KR")).toBe(0);
  });
});
