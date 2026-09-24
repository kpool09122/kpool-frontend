import { expect, test, type Page } from "@playwright/test";

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

test("home page shows the wiki list surface", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Find a wiki",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Search")).toBeVisible();
  await expect(page.getByLabel("Resource")).toHaveValue("");
  await expect(page.getByLabel("Sort")).toHaveValue("asc");
  await expect(page.getByLabel("Per page")).toHaveValue("10");
  await expect(
    page.getByText(/Theme token preview|Open Wiki Detail Demo/i),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: /Wiki list|No wikis found|Wiki list is unavailable/i,
    }),
  ).toBeVisible();
});

test("home page applies filters and resets to the first page", async ({
  page,
}) => {
  await page.goto("/?page=3&perPage=10&sort=name&order=asc");

  await page.getByLabel("Search").fill("aurora");
  await page.getByLabel("Resource").selectOption("group");
  await page.getByLabel("Sort").selectOption("desc");
  await page.getByLabel("Per page").selectOption("30");
  await page.getByRole("button", { name: "Apply" }).click();

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

  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wikiを探す" })).toBeVisible();
  await expect(page.getByLabel("検索")).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wikiを探す" })).toBeVisible();
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

test("signup page prioritizes SSO and offers verified-email passkey registration", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.goto("/login");
  await page.getByRole("link", { name: "アカウント登録へ" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "アカウント登録" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SSOで登録" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleで登録" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "パスキーで登録" })).toBeVisible();
  await expect(page.getByRole("button", { name: "認証コードを送信" })).toBeVisible();
  await expect(page.getByLabel("パスワード", { exact: true })).toHaveCount(0);
});
