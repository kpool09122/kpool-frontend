import { regionalize } from "../fixtures/analyzeRegionalReports";
import { test, expect, type Page } from "./fixtures";
import { appReport, wikiReport } from "../fixtures/analyzeReports";
const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: null,
  accountIdentifier: "22222222-2222-2222-2222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
  accountPrincipalStatus: "active",
  siteManagementPrincipalStatus: "active",
  siteManagementPrincipalIdentifier: "44444444-4444-4444-4444-444444444444",
  siteManagementPrincipalCount: 2,
  siteManagementPolicies: [
    {
      policyIdentifier: "55555555-5555-4555-8555-555555555555",
      name: "Administrator",
      statements: [
        {
          effect: "allow",
          actions: ["principal-group:manage"],
          resourceTypes: ["principal_group"],
          condition: null,
        },
      ],
    },
  ],
  accountType: "individual",
  accountIdentityCount: 1,
  accountPolicies: [],
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  account: {
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    email: "member@example.com",
    type: "individual",
    name: "Member Account",
    status: "active",
    accountCategory: "general",
    phone: null,
    address: null,
  },
};
const principal = {
  principalIdentifier: "44444444-4444-4444-8444-444444444444",
  identityIdentifier: identity.identityIdentifier,
  status: "active",
  policies: [
    {
      policyIdentifier: "55555555-5555-4555-8555-555555555555",
      name: "General",
      statements: [
        {
          effect: "allow",
          actions: ["analysis:view"],
          resourceTypes: ["analysis"],
        },
      ],
    },
  ],
};
async function setup(page: Page) {
  await page.context().addCookies([
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
    {
      name: "kpool-e2e-wiki-principal",
      value: "missing",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.context().addCookies([
    {
      name: "kpool-e2e-site-management",
      value: "administrator",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({ json: identity }),
  );
  await page.route("**/api/wiki/principal/me", (route) =>
    route.fulfill({ status: 404, json: {} }),
  );
}
for (const mobile of [false, true])
  test(`Analyze direct load and activation retry ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }, testInfo) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    let enabled = false;
    let attempts = 0;
    await page.route("**/api/analyze/principal/me", (route) =>
      route.fulfill({
        status: enabled ? 200 : 404,
        json: enabled ? principal : {},
      }),
    );
    await page.route("**/api/analyze/principals", async (route) => {
      attempts++;
      enabled = attempts > 1;
      await route.fulfill({
        status: enabled ? 201 : 500,
        json: enabled ? principal : {},
      });
    });
    await page.goto("/admin/analyze");
    await expect(
      page.getByRole("heading", { level: 1, name: "分析", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary").getByRole("link", { name: "分析", exact: true }),
    ).toHaveCount(0);
    await page.goto("/admin/analyze?test=true");
    await expect(
      page.getByRole("heading", { level: 1, name: "分析", exact: true }),
    ).toBeVisible();
    if (mobile)
      await page
        .getByRole("button", { name: "管理画面メニューを開く" })
        .click();
    const sidebar = page.getByRole("complementary");
    await expect(
      sidebar.getByRole("link", { name: "分析", exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "分析", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    const labels = await sidebar.locator("nav a").allTextContents();
    expect(labels.indexOf("分析")).toBe(labels.indexOf("Wiki") + 1);
    expect(labels.indexOf("サイト管理")).toBe(labels.indexOf("分析") + 1);
    if (mobile)
      await page
        .getByRole("button", { name: "管理画面メニューを閉じる" })
        .click();
    await page
      .getByRole("button", { name: "分析サービスの利用を開始", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "分析の利用" }).getByRole("alert"),
    ).toContainText("失敗");
    await page
      .getByRole("button", { name: "分析サービスの利用を開始", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "分析レポート", exact: true }),
    ).toBeVisible();
    expect(attempts).toBe(2);
    await expect
      .poll(async () => {
        const heading = await page
          .getByRole("heading", { level: 1, name: "分析", exact: true })
          .boundingBox();
        const toggle = await page
          .getByRole("button", {
            name: mobile
              ? "管理画面メニューを開く"
              : "管理画面メニューを閉じる",
          })
          .boundingBox();
        return heading!.x - toggle!.x - toggle!.width;
      })
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`analyze-${mobile ? "mobile" : "desktop"}.png`),
      fullPage: true,
    });
    if (mobile)
      await page.getByRole("button", { name: "管理画面メニューを開く" }).click();
    await sidebar.getByRole("link", { name: "ユーザー設定", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/user\/profile\?test=true$/);
    if (mobile)
      await page.getByRole("button", { name: "管理画面メニューを閉じる" }).click();
    await page.getByRole("tab", { name: "言語", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/user\/language\?test=true$/);
    if (mobile)
      await page.getByRole("button", { name: "管理画面メニューを開く" }).click();
    await expect(sidebar.getByRole("link", { name: "分析", exact: true })).toBeVisible();
    await sidebar.getByRole("link", { name: "分析", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/analyze\?test=true$/);
  });
test.describe("Analyze reports", () => {
  test.use({ hasTouch: true });
  for (const mobile of [false, true])
    test(`report filters, map, table and revoked access ${mobile ? "mobile" : "desktop"}`, async ({
      page,
    }, testInfo) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      await setup(page);
      await page.route("**/api/analyze/principal/me", (route) =>
        route.fulfill({ json: principal }),
      );
      let denied = false;
      let holdCountry = false;
      let releaseCountry = () => {};
      const countryGate = new Promise<void>((resolve) => { releaseCountry = resolve; });
      const queries: URL[] = [];
      await page.route(/\/api\/analyze\/(app|wiki)\/daily-summary/, async (route) => {
        const url = new URL(route.request().url());
        queries.push(url);
        if (holdCountry && url.searchParams.has("country")) await countryGate;
        return route.fulfill({
          status: denied ? 403 : 200,
          json: denied
            ? {}
            : url.pathname.includes("/app/")
              ? appReport
              : wikiReport,
        });
      });
      await page.goto("/admin/analyze");
      const dashboard = page.getByRole("region", {
        name: "分析レポート",
        exact: true,
      });
      const views = dashboard.getByRole("region", {
        name: "閲覧回数",
        exact: true,
      });
      await expect(views.getByTestId("metric-total")).toHaveText(
        "9,007,199,254,740,993",
      );
      await expect(
        dashboard
          .getByRole("region", { name: "提出回数", exact: true })
          .getByTestId("metric-submitters"),
      ).toHaveText("3");
      await views.locator("summary").filter({ hasText: /^詳細$/ }).click();
      const map = dashboard.getByRole("region", { name: "国別の地球儀", exact: true });
      const korea = map.locator('path[data-country="KR"]');
      await korea.scrollIntoViewIfNeeded();
      await korea.hover();
      await expect(map.getByTestId("country-detail")).toContainText("(KR)");
      await expect(map.getByTestId("country-detail")).toContainText("20 秒");
      const japan = map.locator('path[data-country="JP"]');
      await japan.focus();
      const beforeCountry = (await map.boundingBox())!;
      holdCountry = true;
      await page.keyboard.press("Enter");
      await expect.poll(() => queries.filter((url) => url.searchParams.get("country") === "JP").length).toBe(2);
      await expect(views).toBeAttached();
      await expect(views.locator("details").first()).toHaveAttribute("open", "");
      await expect(dashboard.getByText("レポートを取得しています…", { exact: true })).toHaveCount(0);
      const duringCountry = (await map.boundingBox())!;
      expect(Math.abs(duringCountry.y - beforeCountry.y)).toBeLessThan(1);
      expect(Math.abs(duringCountry.height - beforeCountry.height)).toBeLessThan(1);
      holdCountry = false;
      releaseCountry();
      await expect(dashboard.getByRole("heading", { name: "Wiki分析", level: 3 }).locator("..")).toHaveAttribute("aria-busy", "false");
      await expect(map.getByTestId("country-detail")).toContainText("日本 (JP)");
      await expect(map.getByTestId("country-detail")).toContainText("0 秒");
      await expect(map.getByTestId("country-detail").getByText("2位", { exact: true })).toHaveCount(7);
      await korea.hover();
      await expect(map.getByTestId("country-detail")).toContainText("日本 (JP)");
      const globeBounds = (await map.getByRole("group", { name: "国別の地球儀", exact: true }).boundingBox())!;
      const summaryBounds = (await map.getByRole("region", { name: "国別サマリー", exact: true }).boundingBox())!;
      expect(
        summaryBounds.x >= globeBounds.x + globeBounds.width ||
        summaryBounds.y >= globeBounds.y + globeBounds.height,
      ).toBe(true);
      await map.evaluate((element) => element.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: testInfo.outputPath(`reports-tooltip-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
      await page.keyboard.press("ArrowRight");
      await expect(japan).not.toBeFocused();
      await expect(map.getByRole("button", { name: "国不明", exact: true })).toHaveCount(0);
      await korea.tap();
      await expect(map.getByTestId("country-detail")).toContainText("(KR)");
      await expect(map.getByTestId("country-detail")).toContainText("20 秒");
      await map.getByRole("button", { name: "表示をリセット", exact: true }).click();
      const globe = map.getByRole("group", { name: "国別の地球儀", exact: true });
      await globe.scrollIntoViewIfNeeded();
      const originalRotation = await globe.getAttribute("data-rotation");
      const requestsBeforeRotation = queries.length;
      const bounds = (await globe.boundingBox())!;
      const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      if (mobile) {
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
        for (let step = 1; step <= 6; step++)
          await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + step * 12, y: start.y + step * 3 }] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await touch.detach();
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 100, start.y + 20, { steps: 8 });
        await page.mouse.up();
      }
      await expect(globe).not.toHaveAttribute("data-rotation", originalRotation!);
      await expect(map.getByTestId("country-detail")).toHaveCount(0);
      await map.getByRole("button", { name: "表示をリセット", exact: true }).click();
      await expect(globe).toHaveAttribute("data-rotation", originalRotation!);
      await expect(map.locator('path[data-country="JP"]')).toBeVisible();
      expect(queries).toHaveLength(requestsBeforeRotation);
      await map.screenshot({ path: testInfo.outputPath(`globe-${mobile ? "mobile" : "desktop"}.png`) });
      await expect(views.locator("details").first()).toHaveAttribute("open", "");
      await expect(views.getByRole("button", { name: /国不明/ })).toContainText(
        "4",
      );
      const countryChart = views.getByRole("region", { name: "閲覧回数: 国別詳細" });
      await countryChart.locator(".recharts-wrapper").hover({ position: { x: 228, y: 120 } });
      await expect(countryChart.getByRole("button", { name: /\(KR\)/ })).toHaveAttribute("aria-pressed", "true");
      await expect(countryChart.locator(".recharts-tooltip-wrapper")).toHaveCount(0);
      await views.getByRole("region", { name: "閲覧回数: 日別推移" }).getByRole("application").focus();
      await expect(views.getByText("2020-01-01", { exact: true })).toBeVisible();
      await page.keyboard.press("ArrowRight");
      await expect(views.getByRole("combobox")).toHaveCount(0);
      await expect(views.getByText("2020-01-02", { exact: true })).toBeVisible();
      await expect(views.getByTestId("daily-detail")).toHaveCount(0);
      await expect(views.locator(".recharts-pie-sector").first()).toBeVisible();
      await views.screenshot({ path: testInfo.outputPath(`charts-${mobile ? "mobile" : "desktop"}.png`) });
      await dashboard
        .getByLabel("開始日", { exact: true })
        .fill("2020-01-01");
      await dashboard
        .getByLabel("終了日", { exact: true })
        .fill("2020-01-04");
      let releaseWikiSearch = () => {};
      const wikiSearchGate = new Promise<void>((resolve) => { releaseWikiSearch = resolve; });
      let wikiSearchRequests = 0;
      await page.route("**/api/wiki/translation-set-master-search?**", async (route) => {
        wikiSearchRequests++;
        await wikiSearchGate;
        const resourceType = new URL(route.request().url()).searchParams.get("resourceType");
        return route.fulfill({ json: { translationSetMasters: resourceType === "group" ? [{
          translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
          resourceType: "group",
          wikis: [{
            wikiIdentifier: "22222222-2222-4222-8222-222222222222",
            name: "TWICE", slug: "gr-twice", language: "ja",
          }],
        }] : [] } });
      });
      await dashboard.getByLabel("Wiki", { exact: true }).fill("twice");
      const formHeight = await dashboard.locator("form").evaluate((element) => element.getBoundingClientRect().height);
      const globeTop = await map.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
      await dashboard.getByRole("button", { name: "検索", exact: true }).click();
      await expect.poll(() => wikiSearchRequests).toBe(4);
      expect(await dashboard.locator("form").evaluate((element) => element.getBoundingClientRect().height)).toBe(formHeight);
      expect(await map.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)).toBe(globeTop);
      releaseWikiSearch();
      await expect(dashboard.getByRole("option", { name: "TWICE gr-twice" })).toBeVisible();
      expect(await dashboard.locator("form").evaluate((element) => element.getBoundingClientRect().height)).toBe(formHeight);
      await page.screenshot({ path: testInfo.outputPath(`search-form-${mobile ? "mobile" : "desktop"}.png`) });
      await dashboard.getByRole("option", { name: "TWICE gr-twice" }).click();
      expect(await dashboard.locator("form").evaluate((element) => element.getBoundingClientRect().height)).toBe(formHeight);
      expect(await map.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)).toBe(globeTop);
      await dashboard
        .getByRole("combobox", { name: "言語", exact: true })
        .selectOption("ko");
      await page
        .getByRole("button", { name: "分析を取得", exact: true })
        .click();
      const expectedPeriod = await page.evaluate(() => ({
        from: new Date(2020, 0, 1).toISOString().slice(0, 10),
        to: new Date(2020, 0, 4).toISOString().slice(0, 10),
      }));
      await expect
        .poll(
          () =>
            queries.filter(
              (url) =>
                url.searchParams.get("from") === expectedPeriod.from &&
                url.searchParams.get("to") === expectedPeriod.to,
            ).length,
        )
        .toBe(2);
      const appQuery = queries
        .filter((url) => url.pathname.includes("/app/"))
        .at(-1)!;
      expect(Array.from(appQuery.searchParams.keys())).toEqual(["from", "to"]);
      const wikiQuery = queries
        .filter((url) => url.pathname.includes("/wiki/"))
        .at(-1)!;
      expect(wikiQuery.searchParams.has("country")).toBe(false);
      expect(wikiQuery.searchParams.get("language")).toBe("ko");
      expect(wikiQuery.searchParams.get("translationSetIdentifier")).toBe(
        "11111111-1111-4111-8111-111111111111",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await map.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `reports-${mobile ? "mobile" : "desktop"}.png`,
        ),
        fullPage: false,
      });
      denied = true;
      await page
        .getByRole("button", { name: "分析を取得", exact: true })
        .click();
      await expect(dashboard.getByRole("alert")).toContainText("権限");
      await expect(views).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "分析サービスの利用を開始",
          exact: true,
        }),
      ).toHaveCount(0);
    });
});

test("Analyze 403 is never offered re-enrollment", async ({ page }) => {
  await setup(page);
  let creates = 0;
  await page.route("**/api/analyze/principal/me", (route) =>
    route.fulfill({ status: 403, json: {} }),
  );
  await page.route("**/api/analyze/principals", (route) => {
    creates++;
    return route.fulfill({ status: 409, json: {} });
  });
  await page.goto("/admin/analyze");
  await expect(
    page.getByRole("region", { name: "分析の利用" }).getByRole("alert"),
  ).toContainText("権限");
  await expect(
    page.getByRole("button", { name: "分析サービスの利用を開始", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "分析の利用" }).getByRole("alert"),
  ).toContainText("権限");
  expect(creates).toBe(0);
});

for (const mobile of [false, true]) test(`domestic drilldown and restore ${mobile ? "mobile" : "desktop"}`, async ({ page }, testInfo) => {
  if(mobile) await page.setViewportSize({width:390,height:844});
  await setup(page);
  await page.route("**/api/analyze/principal/me", route=>route.fulfill({json:principal}));
  await page.route(/\/api\/analyze\/(app|wiki)\/daily-summary/, route=>route.fulfill({json:route.request().url().includes("/app/")?appReport:wikiReport}));
  const queries: URL[]=[];
  const regionalResponses: (() => void)[] = [];
  await page.route(/\/api\/analyze\/(app|wiki)\/regional-daily-summary/, async route=>{
    const url=new URL(route.request().url());queries.push(url);
    const report=regionalize(url.pathname.includes("/app/")?appReport:wikiReport);
    for(const metric of Object.values(report)) {
      metric.regions.push({region:"JP-01",mapSupported:true,value:"15",denominator:null,quality:[]});
      if(url.searchParams.has("region")) metric.total="42";
    }
    if (url.searchParams.has("region")) await new Promise<void>(resolve => regionalResponses.push(resolve));
    return route.fulfill({json:report});
  });
  await page.goto("/admin/analyze?test=true");
  const globe=page.getByRole("group",{name:"国別の地球儀"});
  await expect(globe).toBeVisible();
  await globe.focus();await globe.press("ArrowRight");
  const rotation=await globe.getAttribute("data-rotation");
  const japan=globe.getByRole("button",{name:/日本 \(JP\):/});
  await japan.focus();await japan.press("Enter");
  const entry=page.getByRole("button",{name:"都道府県・州・省別のデータを見る"});
  await expect(entry).toBeVisible();expect(queries).toHaveLength(0);
  await entry.click();
  const domestic=page.getByRole("region",{name:"国内地図",exact:true});
  await expect(domestic).toBeVisible();
  await expect.poll(()=>queries.length).toBe(2);
  await domestic.getByRole("combobox",{name:"色分けする指標"}).selectOption("views");
  const hokkaido=domestic.locator('[data-region="JP-01"]');
  await expect(hokkaido).not.toHaveAttribute("fill","#cbd5e1");
  const countryViewsCard = page.getByRole("region", { name: "閲覧回数", exact: true });
  await countryViewsCard.locator("summary").click();
  await expect(countryViewsCard.locator(".recharts-pie")).toBeVisible();
  await expect(countryViewsCard.getByRole("button", { name: /北海道 \(JP-01\)/ })).toBeVisible();
  const viewsCardElement = await countryViewsCard.elementHandle();
  await hokkaido.click();
  await expect.poll(()=>queries.filter(url=>url.searchParams.get("region")==="JP-01").length).toBe(2);
  await expect(countryViewsCard.getByTestId("metric-total")).toHaveText("—");
  expect(await viewsCardElement!.evaluate(element => element.isConnected)).toBe(true);
  await expect(countryViewsCard.locator("details")).toHaveAttribute("open", "");
  regionalResponses.splice(0).forEach(resolve => resolve());
  await expect(page.getByRole("region",{name:"閲覧回数",exact:true}).getByTestId("metric-total")).toHaveText("42");
  await expect(page.getByRole("region",{name:"地域別サマリー"})).toContainText("北海道 (JP-01)");
  const viewsCard = page.getByRole("region", { name: "閲覧回数", exact: true });
  await expect(viewsCard.locator("details")).toHaveAttribute("open", "");
  const trend = viewsCard.getByRole("region", { name: "閲覧回数: 日別推移", exact: true });
  await expect(trend.locator(".recharts-surface")).toBeVisible();
  await expect(trend.locator(".recharts-line-curve")).toHaveAttribute("d", /M/);
  await expect.poll(async () => {
    const cardBox = await viewsCard.boundingBox();
    const chartBox = await trend.locator(".recharts-surface").boundingBox();
    return !!cardBox && !!chartBox && chartBox.width > 0 &&
      chartBox.x >= cardBox.x && chartBox.x + chartBox.width <= cardBox.x + cardBox.width + 1;
  }).toBe(true);
  const tokyo = domestic.locator('[data-region="JP-13"]');
  await tokyo.focus();
  await tokyo.press("Enter");
  await expect.poll(() => regionalResponses.length).toBe(2);
  await expect(viewsCard.getByTestId("metric-total")).toHaveText("—");
  expect(await viewsCardElement!.evaluate(element => element.isConnected)).toBe(true);
  await expect(viewsCard.locator("details")).toHaveAttribute("open", "");
  regionalResponses.splice(0).forEach(resolve => resolve());
  await expect(viewsCard.getByTestId("metric-total")).toHaveText("42");
  expect(await viewsCardElement!.evaluate(element => element.isConnected)).toBe(true);
  await expect(viewsCard.locator("details")).toHaveAttribute("open", "");
  await domestic.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`domestic-${mobile?"mobile":"desktop"}.png`),fullPage:true});
  await page.getByRole("button",{name:"表示をリセット"}).click();
  await expect.poll(()=>queries.length).toBe(8);
  await page.getByRole("button",{name:"地球儀に戻る"}).click();
  await expect(globe).toBeVisible();await expect(globe).toHaveAttribute("data-rotation",rotation!);
  await expect(entry).toBeFocused();
  await page.getByRole("button",{name:"分析を取得"}).click();
  await expect(page.getByRole("button",{name:"分析を取得"})).toBeEnabled();
  expect(queries).toHaveLength(8);
});
