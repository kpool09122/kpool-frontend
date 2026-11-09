import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { RegionalMetricCard } from "./RegionalMetricCard";
import { regionalize } from "../../../../tests/fixtures/analyzeRegionalReports";
import { wikiReport } from "../../../../tests/fixtures/analyzeReports";
afterEach(cleanup);
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
