import { analyzeApiTypes } from "@kpool/types";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { analyzeReportDictionaries } from "@/i18n/analyzeReports";
import { metric, wikiReport } from "../../../../tests/fixtures/analyzeReports";
import { CountryMetricChart, DailyMetricChart } from "./MetricCharts";
const report = (data: unknown) => {
  const result = analyzeApiTypes.schemas.MetricReport.safeParse(data);
  if (!result.success) throw result.error;
  return result.data;
};
const props = { name: "閲覧回数", report: report(metric), t: analyzeReportDictionaries.ja, locale: "ja", averageTime: false, showSubmitters: false };
afterEach(cleanup);
it("breaks the daily line at missing days while preserving measured zero and keyboard access", async () => {
  const { container } = render(<DailyMetricChart {...props} />);
  const path = container.querySelector(".recharts-line-curve")?.getAttribute("d") ?? "";
  expect(path.match(/M/g)).toHaveLength(2);
  expect(path).not.toContain("L");
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  const plot = screen.getByRole("application");
  fireEvent.keyDown(plot, { key: "ArrowRight" });
  await waitFor(() => expect(screen.getByText("2020-01-01")).toBeInTheDocument());
  fireEvent.keyDown(plot, { key: "ArrowRight" });
  await waitFor(() => expect(screen.getByText("2020-01-02")).toBeInTheDocument());
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.queryByTestId("daily-detail")).not.toBeInTheDocument();
  expect(screen.queryByText("計測済み")).not.toBeInTheDocument();
});
it("shows a full country ring for one positive country with exact large integer labels", () => {
  const { container } = render(<CountryMetricChart {...props} report={{ ...props.report, countries: [{ ...metric.countries[0], value: "9007199254740993.000000000" }] }} />);
  expect(screen.getByRole("button", { name: /日本.*9,007,199,254,740,993/ })).toBeInTheDocument();
  expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(1);
});
it("compares average times with bars and keeps unavailable averages missing", () => {
  const { container } = render(<CountryMetricChart {...props} averageTime report={report(wikiReport.engagementTime)} />);
  expect(container.querySelector(".recharts-pie")).not.toBeInTheDocument();
  expect(container.querySelector(".recharts-bar")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /\(KR\).*20 秒/ })).toBeInTheDocument();
});
