import { expect, test } from "./fixtures";
const first = "11111111-1111-4111-8111-111111111111";
const second = "33333333-3333-4333-8333-333333333333";
test("settings navigation saves empty scopes and revokes only the confirmed connection", async ({
  page,
}) => {
  await page.context().addCookies([
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
    {
      name: "kpool-mock-account-status",
      value: "active",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  // Use the same Identity as the SSR mock; initialization must also work after reloading the tab.
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({
      json: {
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "Test User",
        email: "test@example.com",
        language: "ja",
        profileImage: null,
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
        accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
        accountPrincipalStatus: "active",
        siteManagementPrincipalStatus: "active",
        accountType: "individual",
        accountIdentityCount: 1,
        accountPolicies: [],
        originalAccount: null,
        delegationIdentifier: null,
        switchableAccounts: [],
        account: null,
      },
    }),
  );
  await page.route("**/api/identity/auth/passkeys", (route) =>
    route.fulfill({ json: { passkeys: [] } }),
  );
  let scopes = ["wiki:read"];
  let revoked: string | null = null;
  await page.route("**/api/identity/oauth/scope-settings", async (route) => {
    if (route.request().method() === "PUT") {
      expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf-token");
      scopes = route.request().postDataJSON().scopes;
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ json: { scopes } });
  });
  await page.route("**/api/identity/oauth/connections", (route) =>
    route.fulfill({
      json: {
        connections: [first, second].map((id) => ({
          connectionIdentifier: id,
          clientIdentifier: "44444444-4444-4444-8444-444444444444",
          clientName: "ChatGPT",
          scopes: ["wiki-drafts:write"],
          createdAt: "2026-11-01T00:00:00Z",
          revokedAt: id === revoked ? "2026-11-18T00:00:00Z" : null,
        })),
      },
    }),
  );
  await page.route("**/api/identity/oauth/connections/*", (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf-token");
    revoked = route.request().url().split("/").at(-1)!;
    return route.fulfill({ json: [] });
  });
  await page.goto("/admin/user/security");
  await expect(page.getByRole("heading", { name: "パスキー管理" })).toBeVisible();
  await expect(page.getByRole("region", { name: "外部連携", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "外部連携", exact: true }).click();
  await expect(page).toHaveURL("/admin/user/external-connections");
  await expect(page.getByRole("tab", { name: "外部連携", selected: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "パスキー管理" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("tab", { name: "外部連携", selected: true })).toBeVisible();
  const region = page.getByRole("region", { name: "外部連携", exact: true });
  await expect(region.getByText("ChatGPT")).toHaveCount(2);
  await region.getByRole("checkbox", { name: /公開 Wiki の取得/ }).uncheck();
  await region.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    region.getByText("許可 Scope 設定を保存しました。"),
  ).toBeVisible();
  expect(scopes).toEqual([]);
  await region
    .getByRole("button", { name: "連携解除", exact: true })
    .nth(1)
    .click();
  const confirmation = region.getByRole("group", { name: "連携解除の確認" });
  await expect(confirmation.getByText("ChatGPT")).toBeVisible();
  expect(revoked).toBeNull();
  await confirmation
    .getByRole("button", { name: "解除する", exact: true })
    .click();
  await expect(
    region.getByText(
      "連携を解除しました。この接続からの操作とトークン更新はできません。",
    ),
  ).toBeVisible();
  expect(revoked).toBe(second);
  await expect(
    region.getByRole("button", { name: "連携解除", exact: true }),
  ).toHaveCount(1);
  await expect(region.getByText("未連携", { exact: true })).toBeVisible();
  await region.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/oauth-connections-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await region.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/oauth-connections-mobile.png",
    fullPage: true,
  });
});
