import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import {
  appReport,
  wikiReport,
} from "../../../../tests/fixtures/analyzeReports";
import { AnalyzeDashboard } from "./AnalyzeDashboard";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
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
      fireEvent.click(screen.getByRole("button", { name: "レポートを再取得" }));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        status === 403 ? "権限" : status === 401 ? "認証" : "HTTP取得失敗",
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
      fireEvent.click(screen.getByRole("button", { name: "レポートを再取得" }));
      await screen.findByRole("region", { name: "閲覧回数" });
    },
  );
  it("rejects an overlong historical period without fetching or changing applied conditions", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.change(screen.getByLabelText("UTC開始日"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByLabelText("UTC終了日"), {
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
    expect(within(views).getByText("未取得")).toBeInTheDocument();
    const submissions = screen.getByRole("region", { name: "提出回数" });
    expect(within(submissions).getByTestId("metric-actors")).toHaveTextContent(
      "3",
    );
    expect(
      within(submissions).queryByText("2026-11-01T01:00:00Z"),
    ).not.toBeInTheDocument();
  });
  it("shows returned zero, unknown and absent countries without fabricating measurements", async () => {
    show();
    const views = await screen.findByRole("region", { name: "閲覧回数" });
    expect(
      within(views)
        .getAllByRole("button")
        .filter((element) => element.tagName.toLowerCase() === "path")
        .every((element) => !!element.getAttribute("d")),
    ).toBe(true);
    const japan = within(views).getByRole("button", {
      name: /^日本 \(JP\): 0/,
    });
    fireEvent.pointerEnter(japan);
    expect(within(views).getByTestId("country-detail")).toHaveTextContent(
      "日本 (JP): 0",
    );
    const us = within(views).getByRole("button", { name: /\(US\):/ });
    fireEvent.focus(us);
    expect(within(views).getByTestId("country-detail")).toHaveTextContent(
      "レスポンスに含まれない国",
    );
    fireEvent.click(within(views).getByRole("button", { name: "国不明" }));
    expect(within(views).getByTestId("country-detail")).toHaveTextContent(
      "国不明: 4",
    );
  });
  it("loads two bulk reports, keeps exact totals, distinct actors and all stored states", async () => {
    show();
    const views = await screen.findByRole("region", { name: "閲覧回数" });
    expect(within(views).getByTestId("metric-total")).toHaveTextContent(
      "9,007,199,254,740,993",
    );
    for (const text of [
      "計測済み",
      "未取得",
      "欠損",
      "不完全",
      "thresholding",
      "2026-11-01T01:00:00Z",
      "国不明",
    ])
      expect(within(views).getAllByText(text).length).toBeGreaterThan(0);
    expect(within(views).getAllByText("—").length).toBeGreaterThan(0);
    const submissions = screen.getByRole("region", { name: "提出回数" });
    expect(within(submissions).getByTestId("metric-actors")).toHaveTextContent(
      "3",
    );
    const balance = screen.getByRole("region", {
      name: "期間最終日の登録者残高",
    });
    expect(within(balance).queryByText("期間総計")).not.toBeInTheDocument();
    expect(
      within(submissions).getByRole("columnheader", {
        name: "日別実行者数（合算不可）",
      }),
    ).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("sends Wiki-only filters without applying them to App or its balance", async () => {
    show();
    await screen.findByRole("region", { name: "閲覧回数" });
    fireEvent.change(screen.getByLabelText("UTC開始日"), {
      target: { value: "2020-01-01" },
    });
    fireEvent.change(screen.getByLabelText("UTC終了日"), {
      target: { value: "2020-01-04" },
    });
    fireEvent.change(screen.getByLabelText("翻訳セットID（空欄はALL）"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.change(screen.getByLabelText("言語"), {
      target: { value: "ko" },
    });
    fireEvent.change(screen.getByLabelText("国"), {
      target: { value: "unknown" },
    });
    fireEvent.click(screen.getByRole("button", { name: "分析を取得" }));
    await screen.findByText("2020-01-01 – 2020-01-04");
    const urls = mocks.fetch.mock.calls.map(([url]) => String(url));
    const appUrl = urls.filter((url) => url.includes("/app/")).at(-1)!;
    const wikiUrl = urls.filter((url) => url.includes("/wiki/")).at(-1)!;
    expect(appUrl).toContain("from=2020-01-01&to=2020-01-04");
    expect(appUrl).not.toMatch(/country|language|translationSet/);
    expect(wikiUrl).toContain("language=ko");
    expect(wikiUrl).toContain("country=unknown");
    expect(wikiUrl).toContain("translationSetIdentifier=11111111");
  });
});
