import { test, expect, type Page } from "./fixtures";
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
  await page
    .context()
    .addCookies([
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
  }) => {
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
      .getByRole("button", { name: "分析の利用を開始", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "分析の利用" }).getByRole("alert"),
    ).toContainText("失敗");
    await page
      .getByRole("button", { name: "分析の利用を開始", exact: true })
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
      path: `/private/tmp/kpool-574-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
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
    page.getByRole("button", { name: "分析の利用を開始", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "状態を再取得" }).click();
  await expect(
    page.getByRole("region", { name: "分析の利用" }).getByRole("alert"),
  ).toContainText("権限");
  expect(creates).toBe(0);
});
