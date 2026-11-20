import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { HomeOverview } from "./HomeOverview";

const statistics = {
  total: 12, languages: { ja: 5, en: 3, ko: 4 },
  resourceTypes: { agency: 1, group: 6, talent: 3, song: 2 },
  groupTypes: { boy_group: 3, girl_group: 2, co_ed: 1, unknown: 0 },
};
afterEach(cleanup);
it("shows totals, breakdowns, ratios and the counting basis", () => {
  render(<HomeOverview locale="ja" statistics={statistics} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("k-pool");
  const card = screen.getByRole("region", { name: "みんなで育てるk-pool" });
  expect(within(card).getByText("12")).toBeInTheDocument();
  expect(within(card).getByText("(50%)")).toBeInTheDocument();
  expect(within(card).getByText("(33.3%)")).toBeInTheDocument();
  expect(within(card).getByText(/翻訳はそれぞれ1件/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Wikiを見つける" })).toHaveAttribute("href", "/ja/wiki");
});
it("shows an unavailable state without making up totals", () => {
  render(<HomeOverview locale="en" statistics={null} />);
  expect(screen.getByText(/Statistics are temporarily unavailable/)).toBeInTheDocument();
  expect(screen.queryByText("Wikis")).not.toBeInTheDocument();
});
it("handles empty statistics without invalid percentages", () => {
  render(<HomeOverview locale="ko" statistics={{ total: 0, languages: { ja: 0, en: 0, ko: 0 }, resourceTypes: { agency: 0, group: 0, talent: 0, song: 0 }, groupTypes: { boy_group: 0, girl_group: 0, co_ed: 0, unknown: 0 } }} />);
  expect(screen.getByText("아직 그룹 위키가 없습니다.")).toBeInTheDocument();
  expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
});
