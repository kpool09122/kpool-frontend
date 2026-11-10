import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { describe, expect, it } from "vitest";
import { metric } from "../../../../tests/fixtures/analyzeReports";
import { metricChange } from "./endpointComparison";

const measuredDay: MetricReport["days"][number] = { ...metric.days[0], availability: "measured" };
const period = { from: "2020-01-01", to: "2020-01-04" };
const days = (first: string, last: string): MetricReport["days"] => [
  { ...measuredDay, value: first },
  { ...measuredDay, day: period.to, value: last },
];

describe("endpoint change", () => {
  it.each([
    ["80", "100", 25], ["100", "80", -20], ["100", "100", 0],
    ["100", "0", -100], ["3.000", "4.000", 33.3],
    ["9007199254740993000", "9907919180215092300", 10],
  ])("compares %s to %s", (first, last, expected) => {
    expect(metricChange(days(first, last), period)).toBe(expected);
  });

  it("requires exact endpoints regardless of order or intermediate gaps", () => {
    const rows = days("80", "100");
    expect(metricChange([...rows].reverse(), period)).toBe(25);
    expect(metricChange(rows, { ...period, to: "2020-01-03" })).toBeNull();
    expect(metricChange(rows, { ...period, to: period.from })).toBe(0);
  });

  it.each(["not_collected", "missing", "incomplete"] as const)(
    "does not use %s endpoint data", (availability) => {
      const rows = days("80", "100");
      rows[0].availability = availability;
      expect(metricChange(rows, period)).toBeNull();
      rows.reverse();
      expect(metricChange(rows, period)).toBeNull();
    },
  );

  it("rejects zero baselines, invalid values and quality flags", () => {
    for (const value of ["0", "", "invalid", "Infinity", "-1"])
      expect(metricChange(days(value, "100"), period)).toBeNull();
    const rows = days("80", "100");
    expect(metricChange([{ ...rows[0], value: null }, rows[1]], period)).toBeNull();
    expect(metricChange([rows[0], { ...rows[1], quality: ["partial"] }], period)).toBeNull();
  });

  it("compares daily averages using each day's denominator", () => {
    const rows = days("100", "150").map((day, index) => ({ ...day, denominator: index ? 5 : 10 }));
    expect(metricChange(rows, period, { averageTime: true })).toBe(200);
    rows[0].denominator = 0;
    expect(metricChange(rows, period, { averageTime: true })).toBeNull();
  });

  it("compares daily submitters independently of submission counts", () => {
    const rows = days("100", "150").map((day, index) => ({ ...day, actorCount: index ? "3" : "2" }));
    expect(metricChange(rows, period, { actorCount: true })).toBe(50);
  });
});
