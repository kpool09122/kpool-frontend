import { regionalize } from "../../../../tests/fixtures/analyzeRegionalReports";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import {
  appReport,
  wikiReport,
} from "../../../../tests/fixtures/analyzeReports";
import { AnalyzeDashboard } from "./AnalyzeDashboard";
import { toUtcReportingDay } from "./reportingPeriod";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), search: vi.fn() }));
vi.mock("@/gateways/wiki/translationSetMasterSearchBrowserApi", () => ({
  fetchAllTranslationSetMasterSearch: (...args: unknown[]) => mocks.search(...args),
}));
const candidate = {
  translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
  resourceType: "group",
  wikis: [],
  displayWiki: { name: "TWICE", slug: "gr-twice", language: "ja" },
};
vi.mock("../AdminProvider", () => ({
  useAdmin: () => ({ t: dictionaries.ja.admin, locale: "ja" }),
}));
vi.mock("@/gateways/support/browserApiFetch", () => ({
  browserApiFetch: (...args: unknown[]) => mocks.fetch(...args),
}));
const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AnalyzeDashboard scope="account-a" version={1} />
    </QueryClientProvider>,
  );
beforeEach(() => {
  mocks.search.mockReset().mockResolvedValue({ translationSetMasters: [candidate] });
  mocks.fetch
    .mockReset()
    .mockImplementation(async (url: string) =>
      Response.json(url.includes("/app/") ? appReport : wikiReport),
    );
});
afterEach(cleanup);
describe("Analyze report dashboard", () => {
  it.each([401, 403, 400, 422, 503])(
    "reflects HTTP %i after previous success rather than treating it as a measurement",
    async (status) => {
      show();
      await screen.findByRole("region", { name: "閲覧回数" });
      mocks.fetch.mockImplementation(async (url: string) =>
        url.includes("/wiki/")
          ? Response.json({}, { status })
          : Response.json(appReport),
      );
      fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        status === 403 ? "権限" : status === 401 ? "認証" : [400, 422].includes(status) ? "条件が不正" : "分析レポートの取得に失敗",
      );
      expect(
        screen.queryByRole("region", { name: "閲覧回数" }),
      ).not.toBeInTheDocument();
      if (status !== 403 && status !== 401)
        expect(
          screen.getByRole("region", { name: "延べ利用者数" }),
        ).toBeInTheDocument();
      mocks.fetch.mockImplementation(async (url: string) =>
        Response.json(url.includes("/wiki/") ? wikiReport : appReport),
      );
      fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
      await screen.findByRole("region", { name: "閲覧回数" });
    },
  );
  it("rejects an overlong historical period without fetching or changing applied conditions", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.change(screen.getByLabelText("開始日"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByLabelText("終了日"), {
      target: { value: "2001-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("最長暦年1年");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("keeps operation histories available when all viewing metrics are not collected", async () => {
    const uncollected = {
      ...wikiReport.views,
      total: null,
      actorCount: null,
      countries: [],
      days: [{ ...wikiReport.views.days[1], day: "2020-01-01" }],
    };
    mocks.fetch.mockImplementation(async (url: string) =>
      Response.json(
        url.includes("/wiki/")
          ? {
              ...wikiReport,
              views: uncollected,
              viewers: uncollected,
              engagementTime: uncollected,
            }
          : appReport,
      ),
    );
    show();
    const views = await screen.findByRole("region", { name: "閲覧回数" });
    expect(within(views).getByTestId("metric-total")).toHaveTextContent("—");
    const submissions = screen.getByRole("region", { name: "提出回数" });
    expect(within(submissions).getByTestId("metric-submitters")).toHaveTextContent(
      "3",
    );
    expect(
      within(submissions).queryByText("2026-11-01T01:00:00Z"),
    ).not.toBeInTheDocument();
  });
  it("colors Taiwan from TW metrics and sends TW when selected", async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      const country = new URL(url, "http://localhost").searchParams.get("country");
      return Response.json(url.includes("/app/") ? appReport : {
        ...wikiReport,
        views: {
          ...wikiReport.views,
          total: country === "TW" ? "5" : wikiReport.views.total,
          countries: [...wikiReport.views.countries,
            { ...wikiReport.views.countries[0], country: "TW", value: "5" },
            { ...wikiReport.views.countries[0], country: "CN", value: "15" },
          ],
        },
      });
    });
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    fireEvent.change(within(globe).getByRole("combobox", { name: "色分けする指標" }), { target: { value: "views" } });
    const taiwan = within(globe).getByRole("button", { name: "台湾 (TW): 5" });
    const china = within(globe).getByRole("button", { name: "中国 (CN): 15" });
    expect(taiwan).not.toHaveAttribute("fill", "#cbd5e1");
    expect(taiwan.getAttribute("fill")).not.toBe(china.getAttribute("fill"));
    fireEvent.click(taiwan);
    await waitFor(() => expect(within(screen.getByRole("region", { name: "閲覧回数" })).getByTestId("metric-total")).toHaveTextContent(/^5$/));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const selectedRequests = mocks.fetch.mock.calls.map(([url]) => new URL(String(url), "http://localhost")).filter((url) => url.searchParams.has("country"));
    expect(selectedRequests.map((url) => url.searchParams.get("country"))).toEqual(["TW", "TW"]);
    expect(within(globe).getByRole("heading", { name: "台湾 (TW)" })).toBeInTheDocument();
  });
  it("shows one globe with all country metrics on hover, focus and touch", async () => {
    show();
    const map = await screen.findByRole("region", { name: "国別の地球儀" });
    await screen.findByRole("region", { name: "閲覧回数" });
    expect(screen.getAllByRole("group", { name: "国別の地球儀" })).toHaveLength(1);
    const paths = within(map).getAllByRole("button").filter((element) => element.tagName.toLowerCase() === "path");
    expect(paths.length).toBeGreaterThan(30);
    expect(within(map).queryByRole("button", { name: "国不明" })).not.toBeInTheDocument();
    expect(paths.every((element) => !!element.getAttribute("d"))).toBe(true);
    const japan = within(map).getByRole("button", { name: "日本 (JP): 総合" });
    fireEvent.pointerEnter(japan);
    const tooltip = screen.getByRole("region", { name: "国別サマリー" });
    expect(tooltip).toHaveTextContent("日本 (JP)");
    for (const name of ["閲覧回数", "延べ閲覧者数", "平均エンゲージメント時間", "提出回数", "公開回数", "延べ利用者数", "登録者数"])
      expect(within(tooltip).getByText(name)).toBeInTheDocument();
    expect(within(tooltip).getAllByText("0")).toHaveLength(6);
    expect(within(tooltip).getByText("0 秒")).toBeInTheDocument();
    fireEvent.pointerLeave(map.querySelector("svg")!.parentElement!);
    expect(screen.queryByTestId("country-detail")).not.toBeInTheDocument();
    fireEvent.focus(within(map).getByRole("button", { name: /\(US\):/ }));
    expect(screen.getByRole("region", { name: "国別サマリー" })).toHaveTextContent("データなし");
    fireEvent.click(within(map).getByRole("button", { name: /\(KR\):/ }));
    expect(screen.getByRole("region", { name: "国別サマリー" })).toHaveTextContent("20 秒");
    fireEvent.click(screen.getByRole("button", { name: "表示をリセット" }));
    expect(screen.queryByTestId("country-detail")).not.toBeInTheDocument();
  });
  it("keeps the clicked country selected until another explicit selection or dismissal", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    const map = screen.getByRole("region", { name: "国別の地球儀" });
    const japan = within(map).getByRole("button", { name: "日本 (JP): 総合" });
    const korea = within(map).getByRole("button", { name: /\(KR\): 総合/ });
    const summary = within(map).getByRole("region", { name: "国別サマリー" });
    fireEvent.click(japan);
    fireEvent.pointerEnter(korea);
    fireEvent.focus(korea);
    expect(within(summary).getByRole("heading", { name: "日本 (JP)" })).toBeInTheDocument();
    fireEvent.click(korea);
    fireEvent.pointerEnter(japan);
    expect(within(summary).getByRole("heading", { name: /\(KR\)/ })).toBeInTheDocument();
    fireEvent.keyDown(within(map).getByRole("group", { name: "国別の地球儀" }), { key: "ArrowRight" });
    expect(within(summary).getByRole("heading", { name: /\(KR\)/ })).toBeInTheDocument();
    fireEvent.click(within(map).getByRole("button", { name: "表示をリセット" }));
    expect(within(summary).getByRole("heading", { name: "すべて" })).toBeInTheDocument();
  });
  it("switches the coloring metric and clears the keyboard country selection", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    const map = screen.getByRole("region", { name: "国別の地球儀" });
    const color = within(map).getByRole("combobox", { name: "色分けする指標" });
    expect(color).toHaveValue("overall");
    fireEvent.change(color, { target: { value: "engagementTime" } });
    expect(color).toHaveValue("engagementTime");
    const korea = within(map).getByRole("button", { name: /\(KR\): 20 秒/ });
    fireEvent.focus(korea);
    expect(screen.getByRole("region", { name: "国別サマリー" })).toHaveTextContent("20 秒");
    expect(screen.getByRole("region", { name: "国別サマリー" })).not.toHaveTextContent("一部のデータが集計対象外です");
    fireEvent.keyDown(korea, { key: "Escape" });
    expect(screen.queryByTestId("country-detail")).not.toBeInTheDocument();
    fireEvent.click(within(map).getByRole("button", { name: /日本 \(JP\):/ }));
    expect(screen.getByRole("region", { name: "国別サマリー" })).toBeInTheDocument();
  });
  it("shows each country's metric ranks only for a selected known country", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    const summary = within(globe).getByRole("region", { name: "国別サマリー" });
    expect(within(summary).queryAllByText(/^[0-9]+位$/)).toHaveLength(0);
    fireEvent.click(within(globe).getByRole("button", { name: "日本 (JP): 総合" }));
    expect(within(summary).getAllByText("2位")).toHaveLength(7);
    fireEvent.click(within(globe).getByRole("button", { name: /\(KR\): 総合/ }));
    expect(within(summary).getAllByText("1位")).toHaveLength(7);
    fireEvent.click(within(globe).getByRole("button", { name: "表示をリセット" }));
    expect(within(summary).queryAllByText(/^[0-9]+位$/)).toHaveLength(0);
    expect(mocks.fetch).toHaveBeenCalledTimes(6);
  });
  it("defaults to overall coloring while retaining individual country metrics", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    const select = within(globe).getByRole("combobox", { name: "色分けする指標" });
    expect(within(select).getByRole("option", { name: "総合" })).toHaveValue("overall");
    expect(select).toHaveValue("overall");
    const japan = within(globe).getByRole("button", { name: "日本 (JP): 総合" });
    const korea = within(globe).getByRole("button", { name: /\(KR\): 総合/ });
    expect(japan).toHaveAttribute("fill", "#f0fdfa");
    expect(korea).toHaveAttribute("fill", "#042f2e");
    fireEvent.click(korea);
    expect(screen.getByTestId("country-detail")).toHaveTextContent("平均エンゲージメント時間");
    expect(screen.getByTestId("country-detail")).toHaveTextContent("20 秒");
    fireEvent.change(select, { target: { value: "views" } });
    expect(within(globe).getByRole("button", { name: /\(KR\): 12/ })).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });
  it("shows weighted average engagement for the period, country, daily rows and globe colors", async () => {
    show();
    const card = await screen.findByRole("region", { name: "平均エンゲージメント時間" });
    expect(within(card).getByTestId("metric-total")).toHaveTextContent("15 秒");
    expect(within(card).getByText("期間平均")).toBeInTheDocument();
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    expect(within(globe).getByRole("region", { name: "国別サマリー" })).toHaveTextContent("15 秒");
    fireEvent.change(within(globe).getByRole("combobox", { name: "色分けする指標" }), { target: { value: "engagementTime" } });
    const korea = within(globe).getByRole("button", { name: /\(KR\): 20 秒/ });
    fireEvent.click(korea);
    expect(screen.getByTestId("country-detail")).toHaveTextContent("20 秒");
  });
  it("shows no average when the corresponding denominator is missing", async () => {
    mocks.fetch.mockImplementation(async (url: string) => Response.json(
      url.includes("/app/") ? appReport : {
        ...wikiReport,
        engagementTime: {
          ...wikiReport.engagementTime,
          denominator: null,
          countries: wikiReport.engagementTime.countries.map((row) => ({ ...row, denominator: null })),
        },
      },
    ));
    show();
    const card = await screen.findByRole("region", { name: "平均エンゲージメント時間" });
    expect(within(card).getByTestId("metric-total")).toHaveTextContent("—");
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    fireEvent.change(within(globe).getByRole("combobox", { name: "色分けする指標" }), { target: { value: "engagementTime" } });
    expect(within(globe).getByRole("button", { name: /\(KR\): —/ })).toHaveAttribute("fill", "#cbd5e1");
  });
  it("loads two bulk reports, keeps exact totals, distinct actors and all stored states", async () => {
    show();
    const views = await screen.findByRole("region", { name: "閲覧回数" });
    expect(within(views).getByTestId("metric-total")).toHaveTextContent(
      "9,007,199,254,740,993",
    );
    expect(within(views).getByRole("button", { name: /国不明/ })).toBeInTheDocument();
    const submissions = screen.getByRole("region", { name: "提出回数" });
    expect(within(submissions).getByTestId("metric-submitters")).toHaveTextContent(
      "3",
    );
    expect(within(submissions).getByText("提出者数")).toBeInTheDocument();
    const publications = screen.getByRole("region", { name: "公開回数" });
    expect(within(publications).queryByTestId("metric-submitters")).not.toBeInTheDocument();
    expect(within(publications).queryByRole("columnheader", { name: /提出者数/ })).not.toBeInTheDocument();
    const balance = screen.getByRole("region", {
      name: "登録者数",
    });
    expect(within(balance).queryByText("期間総計")).not.toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("sends Wiki-only filters without applying them to App or its balance", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.change(screen.getByLabelText("開始日"), {
      target: { value: "2020-01-01" },
    });
    fireEvent.change(screen.getByLabelText("終了日"), {
      target: { value: "2020-01-04" },
    });
    fireEvent.change(screen.getByLabelText("Wiki"), {
      target: { value: "twice" },
    });
    fireEvent.keyDown(screen.getByLabelText("Wiki"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "TWICE gr-twice" }));
    expect(mocks.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: "twice", locale: "ja" }));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    fireEvent.change(screen.getByLabelText("言語"), {
      target: { value: "ko" },
    });
    fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
    const urls = mocks.fetch.mock.calls.map(([url]) => String(url));
    const appUrl = urls.filter((url) => url.includes("/app/")).at(-1)!;
    const wikiUrl = urls.filter((url) => url.includes("/wiki/")).at(-1)!;
    const expectedPeriod = new URLSearchParams({
      from: new Date(2020, 0, 1).toISOString().slice(0, 10),
      to: new Date(2020, 0, 4).toISOString().slice(0, 10),
    }).toString();
    expect(appUrl).toContain(expectedPeriod);
    expect(wikiUrl).toContain(expectedPeriod);
    expect(appUrl).not.toMatch(/country|language|translationSet/);
    expect(wikiUrl).toContain("language=ko");
    expect(new URL(wikiUrl, "http://localhost").searchParams.has("country")).toBe(false);
    expect(wikiUrl).toContain("translationSetIdentifier=11111111");
  });
  it("clears a selected Wiki and returns to all Wikis", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.change(screen.getByLabelText("Wiki"), { target: { value: "twice" } });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    fireEvent.click(await screen.findByRole("option", { name: "TWICE gr-twice" }));
    fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
    expect(String(mocks.fetch.mock.calls.at(-1)![0])).toContain("translationSetIdentifier=");
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.click(screen.getByRole("button", { name: "削除: TWICE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
    expect(String(mocks.fetch.mock.calls.at(-1)![0])).not.toContain("translationSetIdentifier=");
  });
  it("shows empty and failed searches without fetching reports", async () => {
    mocks.search.mockResolvedValueOnce({ translationSetMasters: [] });
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.change(screen.getByLabelText("Wiki"), { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    expect(await screen.findByText("候補が見つかりません。")).toBeInTheDocument();
    mocks.search.mockRejectedValueOnce(new Error("unavailable"));
    fireEvent.change(screen.getByLabelText("Wiki"), { target: { value: "error" } });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wiki候補の検索に失敗しました。");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps expanded reports mounted while loading and ignores a slower previous country", async () => {
    const pending = new Map<string, (response: Response) => void>();
    mocks.fetch.mockImplementation((url: string) => {
      const country = new URL(url, "http://localhost").searchParams.get("country");
      if (country) return new Promise<Response>((resolve) => pending.set(`${country}:${url.includes("/app/") ? "app" : "wiki"}`, resolve));
      return Promise.resolve(Response.json(url.includes("/app/") ? appReport : wikiReport));
    });
    show();
    const views = await screen.findByRole("region", { name: "閲覧回数" });
    const detail = views.querySelector("details")!;
    fireEvent.click(within(views).getByText("詳細", { selector: "summary" }));
    expect(detail).toHaveAttribute("open");
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    fireEvent.click(within(globe).getByRole("button", { name: /日本 \(JP\):/ }));
    expect(screen.getByRole("region", { name: "閲覧回数" })).toBe(views);
    expect(detail).toHaveAttribute("open");
    expect(within(views).getByTestId("metric-total")).toHaveTextContent("9,007,199,254,740,993");
    expect(screen.getByRole("heading", { name: "Wiki分析", level: 3 })).toBeInTheDocument();
    expect(screen.queryByText("レポートを取得しています…")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Wiki分析/, level: 3 }).parentElement).toHaveAttribute("aria-busy", "true");
    fireEvent.click(within(globe).getByRole("button", { name: /\(KR\):/ }));
    await act(async () => {
      pending.get("KR:app")!(Response.json(appReport));
      pending.get("KR:wiki")!(Response.json({ ...wikiReport, views: { ...wikiReport.views, total: "20" } }));
    });
    await waitFor(() => expect(within(views).getByTestId("metric-total")).toHaveTextContent(/^20$/));
    expect(screen.getByRole("heading", { name: "Wiki分析", level: 3 })).toBeInTheDocument();
    expect(detail).toHaveAttribute("open");
    await act(async () => {
      pending.get("JP:app")!(Response.json(appReport));
      pending.get("JP:wiki")!(Response.json({ ...wikiReport, views: { ...wikiReport.views, total: "10" } }));
    });
    expect(within(views).getByTestId("metric-total")).toHaveTextContent(/^20$/);
    expect(screen.getByRole("region", { name: "閲覧回数" })).toBe(views);
    expect(screen.getByRole("heading", { name: /^Wiki分析/, level: 3 }).parentElement).toHaveAttribute("aria-busy", "false");
  });

  it("removes retained reports when the country request denies access", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    mocks.fetch.mockResolvedValue(Response.json({}, { status: 403 }));
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    fireEvent.click(within(globe).getByRole("button", { name: /日本 \(JP\):/ }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("region", { name: "閲覧回数" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "国別の地球儀" })).not.toBeInTheDocument();
  });

  it("loads country-specific totals and daily trends on click, keeps the global globe and resets to all", async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      const country = new URL(url, "http://localhost").searchParams.get("country");
      return Response.json(url.includes("/app/") ? !country ? appReport : {
        ...appReport,
        registeredUsers: { ...appReport.registeredUsers, total: country === "JP" ? "2" : "1" },
      } : !country ? wikiReport : {
        ...wikiReport,
        views: {
          ...wikiReport.views,
          total: country === "JP" ? "7" : "4",
          countries: wikiReport.views.countries,
          days: [{ ...wikiReport.views.days[0], value: country === "JP" ? "7" : "4" }],
        },
      });
    });
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    const globe = screen.getByRole("region", { name: "国別の地球儀" });
    const japan = within(globe).getByRole("button", { name: /日本 \(JP\):/ });
    fireEvent.pointerEnter(japan);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(japan);
    const selected = await screen.findByRole("region", { name: "閲覧回数" });
    await waitFor(() => expect(within(selected).getByTestId("metric-total")).toHaveTextContent(/^7$/));
    expect(within(selected).queryByRole("combobox")).not.toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("region", { name: "登録者数" })).getByTestId("metric-total")).toHaveTextContent(/^2$/));
    expect(within(selected).queryByRole("region", { name: "閲覧回数: 国別詳細" })).not.toBeInTheDocument();
    expect(within(selected).getByRole("region", { name: "閲覧回数: 日別推移" })).toBeInTheDocument();
    expect(within(globe).getByRole("button", { name: /\(KR\): 総合/ })).toBeInTheDocument();
    fireEvent.click(within(globe).getByRole("button", { name: /\(KR\):/ }));
    await waitFor(() => expect(within(screen.getByRole("region", { name: "閲覧回数" })).getByTestId("metric-total")).toHaveTextContent(/^4$/));
    const koreaSelected = screen.getByRole("region", { name: "閲覧回数" });
    expect(within(koreaSelected).queryByRole("region", { name: "閲覧回数: 国別詳細" })).not.toBeInTheDocument();
    expect(within(koreaSelected).getByRole("region", { name: "閲覧回数: 日別推移" })).toBeInTheDocument();
    fireEvent.click(within(globe).getByRole("button", { name: "表示をリセット" }));
    expect(within(screen.getByRole("region", { name: "閲覧回数" })).getByTestId("metric-total")).toHaveTextContent("9,007,199,254,740,993");
    expect(within(screen.getByRole("region", { name: "閲覧回数" })).getByRole("region", { name: "閲覧回数: 国別詳細" })).toBeInTheDocument();
    const countryQueries = mocks.fetch.mock.calls.map(([url]) => new URL(String(url), "http://localhost")).filter((url) => url.searchParams.has("country"));
    expect(countryQueries.map((url) => url.searchParams.get("country"))).toEqual(["JP", "JP", "KR", "KR"]);
    expect(countryQueries.filter((url) => url.pathname.includes("/app/")).map((url) => url.searchParams.get("country"))).toEqual(["JP", "KR"]);
  });

});

it("lazily enters domestic reports, selects/clears a region and restores the globe without regional refetch", async () => {
  mocks.fetch.mockImplementation(async (url: string) => {
    const parsed = new URL(url, "http://localhost");
    const base = url.includes("/app/") ? appReport : wikiReport;
    const report = regionalize(base);
    if (parsed.searchParams.has("region")) for (const metric of Object.values(report)) metric.total = "42";
    return Response.json(url.includes("regional-daily-summary") ? report : base);
  });
  show();
  const globe = await screen.findByRole("group", { name: "国別の地球儀" });
  fireEvent.keyDown(globe, { key: "ArrowRight" });
  const rotation = globe.getAttribute("data-rotation");
  fireEvent.click(within(globe).getByRole("button", { name: /日本 \(JP\):/ }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
  expect(mocks.fetch.mock.calls.some(([url]) => String(url).includes("regional"))).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "都道府県・州・省別のデータを見る" }));
  const domestic = await screen.findByRole("region", { name: "国内地図" });
  await waitFor(() => expect(mocks.fetch.mock.calls.filter(([url]) => String(url).includes("regional"))).toHaveLength(2));
  expect(screen.queryByRole("group", { name: "国別の地球儀" })).not.toBeInTheDocument();
  fireEvent.click(within(domestic).getByRole("button", { name: /東京都 \(JP-13\)/ }));
  await waitFor(() => expect(within(screen.getByRole("region", { name: "閲覧回数" })).getByTestId("metric-total")).toHaveTextContent(/^42$/));
  const queries = mocks.fetch.mock.calls.filter(([url]) => String(url).includes("regional")).map(([url]) => new URL(String(url), "http://localhost"));
  expect(queries.slice(-2).map(url => url.searchParams.get("region"))).toEqual(["JP-13", "JP-13"]);
  fireEvent.click(screen.getByRole("button", { name: "地域選択を解除" }));
  await waitFor(() => expect(mocks.fetch.mock.calls.filter(([url]) => String(url).includes("regional"))).toHaveLength(6));
  fireEvent.click(screen.getByRole("button", { name: "地球儀に戻る" }));
  expect(screen.getByRole("group", { name: "国別の地球儀" })).toHaveAttribute("data-rotation", rotation);
  expect(screen.getByRole("region", { name: "国別サマリー" })).toHaveTextContent("日本 (JP)");
  const count = mocks.fetch.mock.calls.filter(([url]) => String(url).includes("regional")).length;
  fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "分析を取得" })).not.toBeDisabled());
  expect(mocks.fetch.mock.calls.filter(([url]) => String(url).includes("regional"))).toHaveLength(count);
});

it("does not offer domestic navigation for unsupported countries", async () => {
  show();
  const globe = await screen.findByRole("group", { name: "国別の地球儀" });
  fireEvent.click(within(globe).getByRole("button", { name: /\(IN\):/ }));
  expect(screen.queryByRole("button", { name: "都道府県・州・省別のデータを見る" })).not.toBeInTheDocument();
  expect(mocks.fetch.mock.calls.some(([url]) => String(url).includes("regional"))).toBe(false);
});
it("never relabels delayed regional values and cancels domestic requests on return", async () => {
  const pending: { resolve: (value: Response) => void; signal?: AbortSignal }[] = [];
  mocks.fetch.mockImplementation(async (url: string, options?: RequestInit) => {
    if (url.includes("regional") && new URL(url, "http://localhost").searchParams.has("region")) return new Promise<Response>(resolve => pending.push({ resolve, signal: options?.signal ?? undefined }));
    const base = url.includes("/app/") ? appReport : wikiReport;
    return Response.json(url.includes("regional") ? regionalize(base) : base);
  });
  show();
  const globe = await screen.findByRole("group", { name: "国別の地球儀" });
  fireEvent.click(within(globe).getByRole("button", { name: /日本 \(JP\):/ }));
  fireEvent.click(screen.getByRole("button", { name: "都道府県・州・省別のデータを見る" }));
  const domestic = await screen.findByRole("region", { name: "国内地図" });
  await waitFor(() => expect(within(screen.getByRole("region", { name: "地域別サマリー" })).getByText("閲覧回数")).toBeInTheDocument());
  fireEvent.click(within(domestic).getByRole("button", { name: /東京都 \(JP-13\)/ }));
  await waitFor(() => expect(pending).toHaveLength(2));
  expect(screen.getByRole("region", { name: "地域別サマリー" })).toHaveTextContent("東京都");
  expect(within(screen.getByRole("region", { name: "地域別サマリー" })).queryByText("閲覧回数")).not.toBeInTheDocument();
  fireEvent.click(within(domestic).getByRole("button", { name: /大阪府 \(JP-27\)/ }));
  await waitFor(() => expect(pending).toHaveLength(4));
  expect(pending.slice(0,2).every(p=>p.signal?.aborted)).toBe(true);
  await act(async () => pending.slice(0,2).forEach(p=>p.resolve(Response.json(regionalize(wikiReport)))));
  expect(screen.getByRole("region", { name: "地域別サマリー" })).toHaveTextContent("大阪府");
  expect(within(screen.getByRole("region", { name: "地域別サマリー" })).queryByText("閲覧回数")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "地球儀に戻る" }));
  await waitFor(() => expect(pending.every(p=>p.signal?.aborted)).toBe(true));
  await act(async () => pending.forEach(p=>p.resolve(Response.json(regionalize(wikiReport)))));
  expect(screen.queryByRole("region", { name: "地域別サマリー" })).not.toBeInTheDocument();
});
it("transfers applied Wiki/language/period conditions to domestic APIs and resets on condition changes", async () => {
  mocks.fetch.mockImplementation(async (url: string) => {
    const base = url.includes("/app/") ? appReport : wikiReport;
    return Response.json(url.includes("regional") ? regionalize(base) : base);
  });
  show();
  await screen.findByRole("region", { name: "閲覧回数" });
  fireEvent.change(screen.getByLabelText("開始日"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText("終了日"), { target: { value: "2026-01-02" } });
  fireEvent.change(screen.getByLabelText("言語"), { target: { value: "ko" } });
  fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "分析を取得" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: /日本 \(JP\):/ }));
  fireEvent.click(screen.getByRole("button", { name: "都道府県・州・省別のデータを見る" }));
  await waitFor(() => expect(mocks.fetch.mock.calls.filter(([url])=>String(url).includes("regional"))).toHaveLength(2));
  const urls=mocks.fetch.mock.calls.filter(([url])=>String(url).includes("regional")).map(([url])=>new URL(String(url),"http://localhost"));
  for(const url of urls) { expect(url.searchParams.get("country")).toBe("JP"); expect(url.searchParams.has("region")).toBe(false); expect(url.searchParams.get("from")).toBe(toUtcReportingDay("2026-01-01")); expect(url.searchParams.get("to")).toBe(toUtcReportingDay("2026-01-02")); }
  expect(urls.find(url=>url.pathname.includes("wiki"))?.searchParams.get("language")).toBe("ko");
  expect(urls.find(url=>url.pathname.includes("app"))?.searchParams.has("language")).toBe(false);
  await waitFor(() => expect(screen.getByRole("button", { name: "分析を取得" })).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText("言語"), { target: { value: "ja" } });
  fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
  expect(screen.queryByRole("region", { name: "国内地図" })).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "国別サマリー" })).toHaveTextContent("すべて");
});

it.each([401,403,422,500])("clears regional results on HTTP %i and retries without falling back to world values", async status => {
  let failed=false;
  mocks.fetch.mockImplementation(async (url:string) => {
    const base=url.includes("/app/")?appReport:wikiReport;
    if(url.includes("regional") && failed) return Response.json({}, {status});
    return Response.json(url.includes("regional")?regionalize(base):base);
  });
  show();
  const globe=await screen.findByRole("group",{name:"国別の地球儀"});
  fireEvent.click(within(globe).getByRole("button",{name:/日本 \(JP\):/}));
  fireEvent.click(screen.getByRole("button",{name:"都道府県・州・省別のデータを見る"}));
  await waitFor(()=>expect(within(screen.getByRole("region",{name:"地域別サマリー"})).getByText("登録者数")).toBeInTheDocument());
  expect(within(screen.getByRole("region",{name:"登録者数"})).queryByText("期間総計")).not.toBeInTheDocument();
  failed=true;
  fireEvent.click(within(screen.getByRole("region",{name:"国内地図"})).getByRole("button",{name:/東京都 \(JP-13\)/}));
  await screen.findByRole("alert");
  expect(screen.queryByRole("region",{name:"閲覧回数"})).not.toBeInTheDocument();
  if([401,403].includes(status)) expect(screen.queryByRole("button",{name:"地球儀に戻る"})).not.toBeInTheDocument();
  failed=false;
  await waitFor(()=>expect(screen.getByRole("button",{name:"分析を取得"})).not.toBeDisabled());
  fireEvent.click(screen.getByRole("button",{name:"分析を取得"}));
  await screen.findByRole("region",{name:"閲覧回数"});
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
