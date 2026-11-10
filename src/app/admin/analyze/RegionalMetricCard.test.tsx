import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import type { RegionalMetricReport } from "@/gateways/analyze/analyzeReports";
import { RegionalMetricCard } from "./RegionalMetricCard";
import { regionalize } from "../../../../tests/fixtures/analyzeRegionalReports";
import { wikiReport } from "../../../../tests/fixtures/analyzeReports";
afterEach(cleanup);
it("excludes Taiwan from China's regional breakdown without changing the API total", () => {
  const t = dictionaries.ja.admin.analyze.report;
  const report = regionalize(wikiReport).views;
  report.regions = [
    { region: "CN-11", mapSupported: true, value: "20", denominator: null, quality: [] },
    { region: "CN-71", mapSupported: true, value: "10", denominator: null, quality: [] },
  ];
  render(<RegionalMetricCard name={t.views} report={report} t={t} locale="ja" country="CN" onSelect={vi.fn()} />);
  expect(screen.getAllByText(/CN-11/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/CN-71/)).not.toBeInTheDocument();
  expect(screen.getByTestId("metric-total")).toHaveTextContent("9,007,199,254,740,993");
});
it.each(["ja", "en", "ko"] as const)(
  "renders missing/zero/unknown/unmapped values without replacing authoritative totals (%s)",
  (locale) => {
    const report = regionalize(wikiReport).views;
    const t = dictionaries[locale].admin.analyze.report;
    render(
      <RegionalMetricCard
        name={t.views}
        report={report}
        t={t}
        locale={locale}
        onSelect={vi.fn()}
      />,
    );
    const card = screen.getByRole("region", { name: t.views });
    expect(within(card).getByTestId("metric-total")).toHaveTextContent(
      "9,007,199,254,740,993",
    );
    const list = within(card.querySelector("ul")!);
    expect(list.getByText(t.unknownRegion)).toBeInTheDocument();
    expect(list.getByText(/JP-99/)).toHaveTextContent(t.unmappedRegion);
    expect(list.getByText(/^0$/)).toBeInTheDocument();
  },
);
it("does not duplicate PH parent values in the provincial breakdown", () => {
  const t = dictionaries.ja.admin.analyze.report;
  const report = regionalize(wikiReport).views;
  report.regions = [
    {
      region: "PH-11",
      mapSupported: true,
      value: "50",
      denominator: null,
      quality: [],
    },
    {
      region: "PH-DVO",
      mapSupported: true,
      value: "20",
      denominator: null,
      quality: [],
    },
  ];
  render(
    <RegionalMetricCard
      name={t.views}
      report={report}
      t={t}
      locale="ja"
      country="PH"
      level="area"
      onSelect={vi.fn()}
    />,
  );
  expect(screen.queryAllByText(/PH-11/)).toHaveLength(0);
  expect(screen.getAllByText(/PH-DVO/).length).toBeGreaterThan(0);
});

it("shows the regional distribution as a ring and selects regions from its legend", () => {
  const t = dictionaries.ja.admin.analyze.report;
  const onSelect = vi.fn();
  const { container } = render(
    <RegionalMetricCard name={t.views} report={regionalize(wikiReport).views}
      t={t} locale="ja" onSelect={onSelect} />,
  );
  expect(container.querySelector(".recharts-pie")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /東京都 \(JP-13\)/ }));
  expect(onSelect).toHaveBeenCalledWith("JP-13");
  fireEvent.click(screen.getByRole("button", { name: /地域不明/ }));
  expect(onSelect).toHaveBeenLastCalledWith(null);
});

it("uses bars for regional average times and hides the breakdown after selection", () => {
  const t = dictionaries.ja.admin.analyze.report;
  const baseReport: RegionalMetricReport = regionalize(wikiReport).engagementTime;
  const report = { ...baseReport, regions: baseReport.regions.map((row) => ({ ...row, denominator: 10 })) };
  const props = { name: t.engagementTime, report,
    t, locale: "ja", onSelect: vi.fn(), averageTime: true };
  const { container, rerender } = render(<RegionalMetricCard {...props} />);
  expect(container.querySelector(".recharts-bar")).toBeInTheDocument();
  expect(container.querySelector(".recharts-pie")).not.toBeInTheDocument();
  rerender(<RegionalMetricCard {...props} selectedRegion="JP-13" />);
  expect(screen.queryByText(t.regions)).not.toBeInTheDocument();
  expect(screen.getByText(t.trend)).toBeInTheDocument();
});
