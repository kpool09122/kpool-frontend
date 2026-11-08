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
      page.getByText("分析を利用できます。", { exact: true }),
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
      const queries: URL[] = [];
      await page.route(/\/api\/analyze\/(app|wiki)\/daily-summary/, (route) => {
        const url = new URL(route.request().url());
        queries.push(url);
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
          .getByTestId("metric-actors"),
      ).toHaveText("3");
      const korea = views.locator('path[data-country="KR"]');
      await korea.scrollIntoViewIfNeeded();
      await korea.hover();
      await expect(views.getByTestId("country-detail")).toContainText(
        "(KR): 12",
      );
      const japan = views.locator('path[data-country="JP"]');
      await japan.focus();
      await page.keyboard.press("Enter");
      await expect(views.getByTestId("country-detail")).toContainText(
        "(JP): 0",
      );
      await page.keyboard.press("ArrowRight");
      await expect(japan).not.toBeFocused();
      await views.getByRole("button", { name: "国不明", exact: true }).tap();
      await expect(views.getByTestId("country-detail")).toContainText(
        "国不明: 4",
      );
      await views.locator("summary").filter({ hasText: "国別詳細" }).click();
      await expect(views.getByRole("row", { name: /国不明/ })).toContainText(
        "4",
      );
      await expect(
        views.getByRole("cell", { name: "未取得", exact: true }),
      ).toBeVisible();
      await dashboard
        .getByLabel("UTC開始日", { exact: true })
        .fill("2020-01-01");
      await dashboard
        .getByLabel("UTC終了日", { exact: true })
        .fill("2020-01-04");
      await dashboard
        .getByLabel("翻訳セットID（空欄はALL）")
        .fill("11111111-1111-4111-8111-111111111111");
      await dashboard
        .getByRole("combobox", { name: "言語", exact: true })
        .selectOption("ko");
      await dashboard.getByLabel("国", { exact: true }).fill("unknown");
      await page
        .getByRole("button", { name: "分析を取得", exact: true })
        .click();
      await expect(
        dashboard.getByText("2020-01-01 – 2020-01-04", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(
          () =>
            queries.filter(
              (url) => url.searchParams.get("from") === "2020-01-01",
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
      expect(wikiQuery.searchParams.get("country")).toBe("unknown");
      expect(wikiQuery.searchParams.get("language")).toBe("ko");
      expect(wikiQuery.searchParams.get("translationSetIdentifier")).toBe(
        "11111111-1111-4111-8111-111111111111",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await views.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `reports-${mobile ? "mobile" : "desktop"}.png`,
        ),
        fullPage: false,
      });
      denied = true;
      await page
        .getByRole("button", { name: "レポートを再取得", exact: true })
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
  await page.getByRole("button", { name: "状態を再取得" }).click();
  await expect(
    page.getByRole("region", { name: "分析の利用" }).getByRole("alert"),
  ).toContainText("権限");
  expect(creates).toBe(0);
});
