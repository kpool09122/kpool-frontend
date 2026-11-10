import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { analyzeReportDictionaries } from "@/i18n/analyzeReports";
import { MetricCard } from "./MetricCard";
import { RegionalMetricCard } from "./RegionalMetricCard";
import { regionalize } from "../../../../tests/fixtures/analyzeRegionalReports";
import { wikiReport } from "../../../../tests/fixtures/analyzeReports";
import { analyzeApiTypes } from "@kpool/types";

afterEach(cleanup);
const comparison: NonNullable<MetricReport["comparison"]> = {
  from: "2019-12-28", to: "2019-12-31", percentageChange: "25.0", reason: null,
  actorPercentageChange: "-50.0", actorReason: null,
};
const parsed = analyzeApiTypes.schemas.MetricReport.safeParse(wikiReport.views);
if (!parsed.success) throw new Error("Invalid report fixture");
const views = parsed.data;

it.each(["ja", "en", "ko"] as const)("shows the server's previous-period rate and comparison dates (%s)", (locale) => {
  const t = analyzeReportDictionaries[locale];
  const { rerender } = render(<MetricCard name={t.views} report={{ ...views, comparison }} locale={locale} t={t} />);
  // The fixture's endpoint days are zero/missing; only the server rate is authoritative.
  expect(screen.getByText("+25%")).toHaveAttribute("title", expect.stringContaining("2019-12-28 → 2019-12-31"));
  expect(screen.getByText("+25%")).toHaveAccessibleName(expect.stringContaining(t.previousPeriod));
  expect(screen.getByTestId("metric-total")).toHaveTextContent("9,007,199,254,740,993");
  rerender(<MetricCard name={t.views} report={{ ...views, comparison: { ...comparison, percentageChange: null, reason: "zero_baseline" } }} locale={locale} t={t} />);
  expect(screen.getByText(t.zeroBaseline)).toHaveAttribute("title", expect.stringContaining(t.zeroBaseline));
  expect(screen.queryByText("+25%")).not.toBeInTheDocument();
});

it("updates regional comparisons with selected reports and hides stale comparisons while loading", () => {
  const t = analyzeReportDictionaries.ja;
  const props = { name: t.views, locale: "ja", t, onSelect: () => {} };
  const report = { ...regionalize(wikiReport).views, comparison };
  const { rerender } = render(<RegionalMetricCard {...props} report={report} />);
  expect(screen.getByText("+25%")).toBeInTheDocument();
  rerender(<RegionalMetricCard {...props} selectedRegion="JP-13" />);
  expect(screen.queryByText("+25%")).not.toBeInTheDocument();
  expect(screen.queryByText(t.previousPeriodNoData)).not.toBeInTheDocument();
  rerender(<RegionalMetricCard {...props} selectedRegion="JP-13" report={{ ...report, comparison: { ...comparison, percentageChange: "-50.0" } }} />);
  expect(screen.getByText("-50%")).toBeInTheDocument();
});

it("shows the server's average engagement comparison and independent period-distinct actor comparison", () => {
  const t = analyzeReportDictionaries.ja;
  const { rerender } = render(<MetricCard name={t.engagementTime} report={{ ...views, total: "120", denominator: 8, comparison }} averageTime locale="ja" t={t} />);
  expect(screen.getByText("+25%")).toBeInTheDocument();
  expect(screen.getByTestId("metric-total")).toHaveTextContent("15 秒");
  rerender(<MetricCard name={t.submissions} report={{ ...views, comparison }} showSubmitters locale="ja" t={t} />);
  expect(screen.getByText("+25%")).toBeInTheDocument();
  expect(screen.getByText("-50%")).toBeInTheDocument();
});

it.each([
  ["no_previous_data", "previousPeriodNoData"],
  ["no_current_data", "currentPeriodNoData"],
  ["zero_baseline", "zeroBaseline"],
  ["invalid_denominator", "invalidDenominator"],
] as const)("shows a specific explanation for %s", (reason, key) => {
  const t = analyzeReportDictionaries.ja;
  render(<MetricCard name={t.views} report={{ ...views, comparison: { ...comparison, percentageChange: null, reason } }} locale="ja" t={t} />);
  expect(screen.getByText(t[key])).toBeInTheDocument();
  expect(screen.queryByText("算出不可")).not.toBeInTheDocument();
});
