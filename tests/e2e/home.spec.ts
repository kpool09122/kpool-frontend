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

test("home page shows the theme preview content", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Trust-forward colors for a calm, premium first impression/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Theme token preview/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("--brand-primary")).toBeVisible();
  await expect(page.getByText("Deep Harbor")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open Wiki Detail Demo/i }),
  ).toBeVisible();

  await expect(page.getByTestId("theme-mode-label")).toHaveText(/light|dark/i);
  await page.getByRole("button", { name: /toggle color theme/i }).click();
  await expect(page.getByTestId("theme-mode-label")).toHaveText("Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("link", { name: /Open Wiki Detail Demo/i }).click();
  await expect(
    page.getByRole("heading", { name: /Aurora Echo/i }),
  ).toBeVisible();
});

test("home page demo links open the wiki detail page with a theme color override", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByTestId("wiki-theme-demo-rose-stage").click();

  await expect(page).toHaveURL(/themeColor=%23d94f70/);
  await expect(page.getByTestId("wiki-theme-badge")).toHaveText("Theme #D94F70");
  await expect(page.getByTestId("wiki-theme-root")).toHaveAttribute(
    "style",
    /--wiki-page-background-light:/,
  );
});

test("guest locale defaults to English and persists language switching", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
});

test("mobile header menu shows the login link", async ({ page }) => {
  await useJapaneseLocale(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "K-Pool" })).toBeVisible();
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
    page.getByRole("button", { name: "メールアドレスでログイン" }),
  ).toBeVisible();
});

test("login page starts SSO redirect through the Identity API proxy", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.route("**/api/identity/auth/social/google/redirect", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ redirectUrl: "/mypage?sso=google" }),
    });
  });
  await page.goto("/login");

  await page.getByRole("button", { name: /Google.*でログイン/ }).click();

  await expect(page).toHaveURL(/\/mypage\?sso=google$/);
});

test("login page submits email credentials through the Identity API proxy", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.route("**/api/identity/auth/login", async (route) => {
    const requestBody = route.request().postDataJSON();

    expect(requestBody).toEqual({
      email: "member@example.com",
      password: "secret-password",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
      }),
    });
  });
  await page.goto("/login");

  await page.getByLabel("メールアドレス").fill("member@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("secret-password");
  await page.getByRole("button", { name: "メールアドレスでログイン" }).click();

  await expect(page).toHaveURL(/\/mypage$/);
});

test("login page links to signup and completes the signup flow through API proxies", async ({
  page,
}) => {
  await useJapaneseLocale(page);
  await page.route("**/api/account/accounts", async (route) => {
    const requestBody = route.request().postDataJSON();

    expect(requestBody).toEqual({
      email: "new-member@example.com",
      accountName: "New Member Account",
      accountType: "individual",
      identityIdentifier: null,
    });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
        email: "new-member@example.com",
        type: "individual",
        name: "New Member Account",
        status: "active",
        accountCategory: "standard",
      }),
    });
  });
  await page.route("**/api/identity/auth/verify-email", async (route) => {
    const requestBody = route.request().postDataJSON();

    expect(requestBody).toEqual({
      email: "new-member@example.com",
      authCode: "123456",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        email: "new-member@example.com",
        verifiedAt: "2026-05-05T00:00:00+00:00",
      }),
    });
  });
  await page.route("**/api/identity/auth/register", async (route) => {
    const requestBody = route.request().postDataJSON();

    expect(requestBody).toEqual({
      username: "New Member Account",
      email: "new-member@example.com",
      password: "secret-password",
      confirmedPassword: "secret-password",
      base64EncodedImage: null,
      invitationToken: null,
      requestLanguage: "ja",
    });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "New Member Account",
        email: "new-member@example.com",
        language: "ja",
      }),
    });
  });

  await page.goto("/login");
  await page.getByRole("link", { name: "アカウント登録へ" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "アカウント登録" })).toBeVisible();

  await page.getByLabel("登録用メールアドレス").fill("new-member@example.com");
  await page.getByLabel("アカウント名").fill("New Member Account");
  await page.getByRole("main").getByLabel("言語").selectOption("ja");
  await page.getByRole("button", { name: "認証コードを送信" }).click();

  await expect(page.getByRole("heading", { name: "認証コード入力" })).toBeVisible();
  await expect(
    page.getByRole("listitem", { name: "アカウント情報入力: 完了" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem", { name: "認証コード入力: 入力中" }),
  ).toBeVisible();

  await page.getByLabel("認証コード", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "認証コードを確認" }).click();

  await expect(page.getByRole("heading", { name: "登録情報設定" })).toBeVisible();
  await expect(
    page.getByRole("listitem", { name: "認証コード入力: 完了" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem", { name: "登録情報設定: 入力中" }),
  ).toBeVisible();

  await page.getByLabel("パスワード", { exact: true }).fill("secret-password");
  await page.getByLabel("確認用パスワード").fill("secret-password");
  await page.getByRole("button", { name: "登録を完了" }).click();

  await expect(page).toHaveURL(/\/mypage$/);
});
