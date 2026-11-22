import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { HomeOverview } from "./HomeOverview";

const statistics = {
  total: 12, languages: { ja: 5, en: 3, ko: 4 },
  byLanguage: {
    ja: { resourceTypes: { agency: 0, group: 2, talent: 2, song: 1 }, groupTypes: { boy_group: 1, girl_group: 1, co_ed: 0, unknown: 0 } },
    en: { resourceTypes: { agency: 1, group: 0, talent: 1, song: 1 }, groupTypes: { boy_group: 0, girl_group: 0, co_ed: 0, unknown: 0 } },
    ko: { resourceTypes: { agency: 0, group: 4, talent: 0, song: 0 }, groupTypes: { boy_group: 2, girl_group: 1, co_ed: 1, unknown: 0 } },
  },
};
afterEach(cleanup);
it("shows totals, breakdowns, ratios and the counting basis", () => {
  render(<HomeOverview locale="ja" statistics={statistics} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("k-pool");
  const card = screen.getByRole("region", { name: "みんなで育てるk-pool" });
  expect(within(card).getByText("12")).toBeInTheDocument();
  expect(within(card).getAllByText("(50%)")[0]).toBeInTheDocument();
  expect(within(card).queryByText("(33.3%)")).not.toBeInTheDocument();
  expect(within(card).getByText("日本語のWiki")).toHaveTextContent("5");
  const languages = within(card).getByRole("heading", { name: "言語別（全体）" }).parentElement!;
  expect(within(languages).getByText("4")).toBeInTheDocument();
  const resources = within(card).getByRole("heading", { name: "種別別" }).parentElement!;
  expect(within(resources).getByText("事務所").parentElement).toHaveTextContent("0");
  expect(within(resources).getByText("グループ").parentElement).toHaveTextContent("2");
  expect(within(card).getByText("総数・言語別は全言語、種別別・グループ構成は日本語のページを集計。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Wikiを見つける" })).toHaveAttribute("href", "/ja/wiki");
});
it("shows an unavailable state without making up totals", () => {
  render(<HomeOverview locale="en" statistics={null} />);
  expect(screen.getByText(/Statistics are temporarily unavailable/)).toBeInTheDocument();
  expect(screen.queryByText("Wikis")).not.toBeInTheDocument();
});
it("handles empty statistics without invalid percentages", () => {
  const emptyBreakdown = {
    resourceTypes: { agency: 0, group: 0, talent: 0, song: 0 },
    groupTypes: { boy_group: 0, girl_group: 0, co_ed: 0, unknown: 0 },
  };
  render(<HomeOverview locale="ko" statistics={{
    total: 0,
    languages: { ja: 0, en: 0, ko: 0 },
    byLanguage: { ja: emptyBreakdown, en: emptyBreakdown, ko: emptyBreakdown },
  }} />);
  expect(screen.getByText("아직 그룹 위키가 없습니다.")).toBeInTheDocument();
  expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
});

it("uses the selected language while keeping the global total and language counts", () => {
  render(<HomeOverview locale="en" statistics={statistics} />);
  expect(screen.getByText("12")).toBeInTheDocument();
  expect(screen.getByText("Wikis in English")).toHaveTextContent("3");
  expect(screen.getByText("No group wikis yet.")).toBeInTheDocument();
  const languages = screen.getByRole("heading", { name: "By language (all)" }).parentElement!;
  expect(within(languages).getByText("5")).toBeInTheDocument();
  expect(within(languages).getByText("4")).toBeInTheDocument();
});
