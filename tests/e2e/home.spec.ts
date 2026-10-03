import { expect, test, type Page } from "./fixtures";

const useJapaneseLocale = async (page: Page) => {
  await page.context().addCookies([
    {
      name: "kpool-locale",
      value: "ja",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
};

test("home page shows Wiki discovery sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Recently updated wikis" })).toBeVisible();
  await expect(page.getByRole("region", { name: "New wikis" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Frequently updated wikis" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recently updated wikis" }).getByRole("link", { name: "View more" }))
    .toHaveAttribute("href", "/en/wiki?sort=updatedAt&order=desc&perPage=10&page=1");
});

test("wiki list applies filters and resets to the first page", async ({
  page,
}) => {
  await page.goto("/en/wiki?page=3&perPage=10&sort=name&order=asc");

  await page.getByLabel("Search").fill("aurora");
  await page.getByLabel("Resource").selectOption("group");
  await page.getByLabel("Sort").selectOption("desc");
  await page.getByLabel("Per page").selectOption("30");

  await expect(page).toHaveURL(/keyword=aurora/);
  await expect(page).toHaveURL(/resourceType=group/);
  await expect(page).toHaveURL(/sort=name/);
  await expect(page).toHaveURL(/order=desc/);
  await expect(page).toHaveURL(/perPage=30/);
  await expect(page).not.toHaveURL(/page=3/);
  await expect(page.getByLabel("Search")).toHaveValue("aurora");
  await expect(page.getByLabel("Resource")).toHaveValue("group");
  await expect(page.getByLabel("Sort")).toHaveValue("desc");
  await expect(page.getByLabel("Per page")).toHaveValue("30");
});

test("guest locale defaults to English and persists language switching", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  await expect(async () => {
    await page.getByRole("banner").getByRole("combobox").selectOption("ja");
    await expect(page).toHaveURL(/\/ja$/, { timeout: 1000 });
  }).toPass();
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近更新されたWiki" })).toBeVisible();
  await expect(page.getByRole("region", { name: "最近更新されたWiki" }).getByLabel("種別")).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近更新されたWiki" })).toBeVisible();
});

test("mobile header menu shows the login link", async ({ page }) => {
  await useJapaneseLocale(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "k-pool" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ログイン" })).toBeHidden();

  const menuButton = page.getByRole("button", {
    name: "ナビゲーションメニュー",
  });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await expect(async () => {
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true", {
      timeout: 1000,
    });
  }).toPass();
  await expect(
    page.getByRole("navigation", { name: "モバイルメニュー" }).getByRole("link", {
      name: "ログイン",
    }),
  ).toBeVisible();
});

test("guest header login link opens the login page", async ({ page }) => {
  await useJapaneseLocale(page);
  await page.goto("/");

  await page.getByRole("link", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "ログイン", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Google.*でログイン/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "パスキーでログイン" }),
  ).toBeVisible();
});

test("login page starts SSO redirect through the Identity API proxy", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.route("**/api/identity/auth/social/google/redirect?*", async (route) => {
    await page.context().addCookies([{ name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" }]);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ redirectUrl: "/admin?sso=google" }),
    });
  });
  await page.goto("/login");

  await page.getByRole("button", { name: /Google.*でログイン/ }).click();

  await expect(page).toHaveURL(/\/admin\/wiki\/editing$/);
});

test("login page prioritizes SSO and offers passkey without password fields", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.goto("/login");

  const buttons = page.getByRole("button");
  await expect(buttons.filter({ hasText: "Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "パスキーでログイン" })).toBeVisible();
  await expect(page.getByLabel("パスワード", { exact: true })).toHaveCount(0);
});

test("login page opens passkey recovery and keeps email responses enumeration-safe", async ({ page }) => {
  await useJapaneseLocale(page);
  await page.route("**/api/identity/auth/passkeys/recovery/email", async (route) => {
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf-token");
    await route.fulfill({ status: 204 });
  });
  await page.goto("/login");

  await page.getByRole("link", { name: "パスキーを復旧" }).click();
  await expect(page).toHaveURL(/\/settings\/passkeys\/recovery$/);
  await expect(page.getByRole("button", { name: "Googleで本人確認" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "メールで本人確認" })).toBeVisible();
  await page.getByLabel("登録済みメールアドレス").fill("unknown@example.com");
  await page.getByRole("button", { name: "確認コードを送信" }).click();

  await expect(page.getByLabel("確認コード")).toBeVisible();
  await expect(page.getByLabel("登録済みメールアドレス")).toHaveCount(0);
});

test("signup page offers verified-email passkey registration without an account type", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.goto("/login");
  await page.getByRole("link", { name: "アカウント登録へ" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "アカウント登録" })).toBeVisible();
  await expect(page.getByLabel("登録用メールアドレス", { exact: true })).toBeVisible();
  await expect(page.getByLabel("アカウント名", { exact: true })).toBeVisible();
  await expect(page.getByLabel("アカウント区分", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "認証コードを送信" })).toBeVisible();
  await expect(page.getByLabel("パスワード", { exact: true })).toHaveCount(0);
});
