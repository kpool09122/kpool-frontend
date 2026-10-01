import { expect, test, type Page } from "./fixtures";

import { mockAccountStatusCookieName } from "@/gateways/identity/authIdentity";

const accountErrorMessage = "時間を置いて再度ログインしてください。解決しない場合は、運営にお問い合わせください。";
const identity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: null,
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  accountType: "individual",
  accountPolicies: [],
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
};

async function mockAccount(page: Page, initialStatus: string) {
  let status = initialStatus;
  const setStatus = async (next: string) => {
    status = next;
    await page.context().addCookies([
      { name: mockAccountStatusCookieName, value: next, domain: "127.0.0.1", path: "/" },
    ]);
  };
  await page.context().addCookies([
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
  ]);
  await setStatus(initialStatus);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({
    json: {
      ...identity,
      account: status === "missing" ? null : {
        accountIdentifier: identity.accountIdentifier,
        name: "Member Account",
        email: identity.email,
        type: status === "pending" ? null : "individual",
        status,
        accountCategory: "general",
      },
    },
  }));
  return setStatus;
}

async function mockPasskey(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.credentials, "get", {
      value: async () => {
        const response = Object.create(AuthenticatorAssertionResponse.prototype);
        Object.defineProperties(response, {
          clientDataJSON: { value: new ArrayBuffer(1) },
          authenticatorData: { value: new ArrayBuffer(1) },
          signature: { value: new ArrayBuffer(1) },
          userHandle: { value: null },
        });
        const credential = Object.create(PublicKeyCredential.prototype);
        Object.defineProperties(credential, {
          id: { value: "credential" },
          rawId: { value: new ArrayBuffer(1) },
          response: { value: response },
          authenticatorAttachment: { value: "platform" },
          getClientExtensionResults: { value: () => ({}) },
        });
        return credential;
      },
    });
  });
  await page.route("**/api/identity/auth/passkeys/authentication/options", (route) => route.fulfill({
    json: {
      challengeKey: "44444444-4444-4444-8444-444444444444",
      options: { challenge: "YQ", timeout: 60000, rpId: "127.0.0.1", allowCredentials: [], userVerification: "preferred" },
    },
  }));
  await page.route("**/api/identity/auth/passkeys/authentication", (route) => route.fulfill({ json: identity }));
}

for (const method of ["sso", "passkey"] as const) {
  test(`${method} pending account completes setup and returns to the public Wiki`, async ({ page }) => {
    const setStatus = await mockAccount(page, "pending");
    const destination = "/wiki/ja/gr-aurora-echo";
    if (method === "sso") {
      await page.route("**/api/identity/auth/social/google/redirect?*", async (route) => {
        const returnTo = new URL(route.request().url()).searchParams.get("return_to");
        expect(returnTo).toBe(`/admin?authReturnTo=${encodeURIComponent(destination)}`);
        await route.fulfill({ json: { redirectUrl: returnTo } });
      });
    } else {
      await mockPasskey(page);
    }
    const setupRequests: unknown[] = [];
    await page.route("**/api/account/accounts/setup", async (route) => {
      setupRequests.push(route.request().postDataJSON());
      await setStatus("active");
      await route.fulfill({ status: 204 });
    });
    await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
    await page.getByRole("button", { name: method === "sso" ? "Googleでログイン" : "パスキーでログイン" }).click();
    await expect(page.getByRole("heading", { name: "アカウントの初期設定" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "管理画面メニュー" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Wiki", exact: true })).toHaveCount(0);
    await expect(page.getByRole("radio").first()).toHaveAccessibleName("個人");
    await expect(page.getByRole("radio", { name: "個人" })).toBeChecked();
    await page.getByRole("button", { name: "区分を確定してサービスを開始" }).click();
    await expect(page).toHaveURL(destination);
    expect(setupRequests).toEqual([{ accountType: "individual" }]);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Wiki", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "アカウントの初期設定" })).toHaveCount(0);
  });
}

test("pending account resumes setup after reload and direct access while public pages remain available", async ({ page }) => {
  await mockAccount(page, "pending");
  for (const path of ["/admin/wiki/submitted", "/admin/account/profile", "/wiki/ja/gr-aurora-echo/edit"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "アカウントの初期設定" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "アカウントの初期設定" })).toBeVisible();
  }
  await page.goto("/wiki/ja/gr-aurora-echo");
  await expect(page.getByRole("heading", { name: "Aurora Echo", exact: true })).toBeVisible();
});

test("pending account can log out before completing setup", async ({ page }) => {
  await mockAccount(page, "pending");
  await page.route("**/api/identity/auth/logout", async (route) => {
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf-token");
    await page.context().clearCookies({ name: mockAccountStatusCookieName });
    await page.route("**/api/identity/auth/me", (authRoute) => authRoute.fulfill({ status: 401 }));
    await route.fulfill({ status: 204 });
  });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "アカウントの初期設定" })).toBeVisible();
  await page.getByRole("banner").getByRole("button", { name: /member/ }).hover();
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン", exact: true })).toBeVisible();
});

for (const status of ["missing", "unknown"]) {
  test(`${status} account shows recovery guidance on direct access`, async ({ page }) => {
    await mockAccount(page, status);
    await page.goto("/admin/wiki/editing");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(accountErrorMessage);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "管理画面メニュー" })).toHaveCount(0);
    await page.goto("/wiki/ja/gr-aurora-echo/edit");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(accountErrorMessage);
  });
}

test("passkey login stops with recovery guidance when no account is associated", async ({ page }) => {
  await mockAccount(page, "missing");
  await mockPasskey(page);
  await page.goto("/login?returnTo=%2Fadmin");
  await page.getByRole("button", { name: "パスキーでログイン" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(accountErrorMessage);
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole("button", { name: "パスキーでログイン" })).toBeEnabled();
});
