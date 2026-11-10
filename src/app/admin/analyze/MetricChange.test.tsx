import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { analyzeReportDictionaries } from "@/i18n/analyzeReports";
import { metric } from "../../../../tests/fixtures/analyzeReports";
import { MetricCard } from "./MetricCard";
import { RegionalMetricCard } from "./RegionalMetricCard";
import { regionalize } from "../../../../tests/fixtures/analyzeRegionalReports";
import { wikiReport } from "../../../../tests/fixtures/analyzeReports";

afterEach(cleanup);
const measuredDay: MetricReport["days"][number] = { ...metric.days[0], availability: "measured" };
const period = { from: "2020-01-01", to: "2020-01-04" };
const days: MetricReport["days"] = [
  { ...measuredDay, value: "80" },
  { ...measuredDay, day: period.to, value: "100" },
];

it.each(["ja", "en", "ko"] as const)("shows endpoint changes beside totals (%s)", (locale) => {
  const t = analyzeReportDictionaries[locale];
  const { rerender } = render(<MetricCard name={t.views} report={{ ...metric, days }} period={period} locale={locale} t={t} />);
  expect(screen.getByText("+25%")).toHaveAttribute("title", expect.stringContaining("2020-01-01 → 2020-01-04"));
  expect(screen.getByTestId("metric-total")).toHaveTextContent("9,007,199,254,740,993");
  rerender(<MetricCard name={t.views} report={{ ...metric, days }} period={{ ...period, to: "2020-01-03" }} locale={locale} t={t} />);
  expect(screen.getByText(t.changeUnavailable)).toBeInTheDocument();
  expect(screen.queryByText("+25%")).not.toBeInTheDocument();
});

it("updates regional changes with selected reports and clears them while loading", () => {
  const t = analyzeReportDictionaries.ja;
  const props = { name: t.views, period, locale: "ja", t, onSelect: () => {} };
  const report = { ...regionalize(wikiReport).views, days };
  const { rerender } = render(<RegionalMetricCard {...props} report={report} />);
  expect(screen.getByText("+25%")).toBeInTheDocument();
  rerender(<RegionalMetricCard {...props} selectedRegion="JP-13" />);
  expect(screen.getByText(t.changeUnavailable)).toBeInTheDocument();
  rerender(<RegionalMetricCard {...props} selectedRegion="JP-13" report={{ ...report, days: [{ ...days[0], value: "200" }, days[1]] }} />);
  expect(screen.getByText("-50%")).toBeInTheDocument();
});
