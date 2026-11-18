import { expect, test, type Page } from "./fixtures";

const params = new URLSearchParams({ client_id: "00000000-0000-4000-8000-000000000001", redirect_uri: "https://client.example/callback", scope: "wiki:read wiki-drafts:write wiki-images:write", resource: "https://api.example/mcp", code_challenge: "challenge+value", code_challenge_method: "S256", response_type: "code", state: "original + & 雪" });
const entry = `/auth/oauth/authorize?${params}`;
const identity = { identityIdentifier: "11111111-1111-4111-8111-111111111111", identityName: "member", email: "member@example.com", language: "ja", profileImage: null, accountIdentifier: "22222222-2222-4222-8222-222222222222", accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333", accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", accountType: "individual", accountPolicies: [], accountIdentityCount: 1, originalAccount: null, delegationIdentifier: null, switchableAccounts: [], authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] }, account: { accountIdentifier: "22222222-2222-4222-8222-222222222222", name: "Account", email: "member@example.com", type: "individual", status: "active", accountCategory: "general" } };
async function setup(page: Page, scopes = ["wiki:read", "wiki-drafts:write"]) {
  let creates = 0; let selected: unknown = null;
  await page.context().addCookies([{ name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: identity }));
  await page.route("**/api/identity/oauth/requests", (route) => {
    creates += 1;
    expect(route.request().postDataJSON()).toMatchObject({ state: params.get("state"), codeChallenge: params.get("code_challenge"), scopes: ["wiki:read", "wiki-drafts:write", "wiki-images:write"] });
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf-token");
    return route.fulfill({ status: 201, json: { requestIdentifier: "server-id", expiresAt: new Date(Date.now() + 600000).toISOString() } });
  });
  await page.route("**/api/identity/oauth/requests/server-id", (route) => route.fulfill({ json: { requestIdentifier: "server-id", expiresAt: new Date(Date.now() + 600000).toISOString(), clientName: "ChatGPT", scopes: scopes.map((scope) => ({ scope, description: scope })) } }));
  await page.route("**/api/identity/oauth/requests/server-id/approve", (route) => { selected = route.request().postDataJSON(); return route.fulfill({ json: { redirectUri: "https://client.example/callback?code=code&state=original" } }); });
  await page.route("**/api/identity/oauth/requests/server-id/deny", (route) => route.fulfill({ json: { redirectUri: "https://client.example/callback?error=access_denied&state=original" } }));
  await page.route("https://client.example/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>OAuth client</h1>" }));
  return { creates: () => creates, selected: () => selected };
}
test("authenticated consent creates once, shows only backend candidates, and redirects after explicit approval", async ({ page }) => {
  const state = await setup(page);
  await page.goto(entry);
  const region = page.getByRole("region", { name: "外部アプリへの接続" });
  await expect(region.getByText("ChatGPT")).toBeVisible();
  await expect(region.getByRole("checkbox")).toHaveCount(2);
  await expect(region.getByRole("button", { name: "承認", exact: true })).toBeDisabled();
  await region.getByLabel(/wiki-drafts:write/).check();
  await page.screenshot({ path: "test-results/oauth-consent-desktop.png", fullPage: true });
  await region.getByRole("button", { name: "承認", exact: true }).click();
  await expect(page).toHaveURL("https://client.example/callback?code=code&state=original");
  expect(state.selected()).toEqual({ scopes: ["wiki-drafts:write"] }); expect(state.creates()).toBe(1);
});
test("mobile empty candidates link to settings and can cancel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page, []); await page.goto(entry);
  const region = page.getByRole("region", { name: "外部アプリへの接続" });
  await expect(region.getByText("ChatGPT")).toBeVisible();
  await expect(region.getByRole("button", { name: "承認", exact: true })).toHaveCount(0);
  await expect(region.getByRole("heading", { name: "許可できる操作がありません" })).toBeVisible();
  await expect(region.getByRole("link", { name: "許可する操作を設定" })).toHaveAttribute("href", "/admin/user/security");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/oauth-consent-mobile-empty.png", fullPage: true });
  await region.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(page).toHaveURL("https://client.example/callback?error=access_denied&state=original");
});
test("signed-out entry preserves the original query in the existing login returnTo", async ({ page }) => {
  const state = await setup(page); await page.route("**/api/identity/auth/me", (route) => route.fulfill({ status: 401 }));
  await page.goto(entry);
  const login = page.getByRole("region", { name: "外部アプリへの接続" }).getByRole("link", { name: "ログイン", exact: true });
  await expect(login).toBeVisible(); const href = await login.getAttribute("href");
  expect(new URL(href!, "http://localhost").searchParams.get("returnTo")).toBe(entry); expect(state.creates()).toBe(0);
  await login.click(); await expect(page).toHaveURL(/\/login\?returnTo=/);
  // #632 owns the passkey/SSO login itself. Resume with authenticated fixtures at the unchanged return URL.
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: identity })); await page.goto(entry);
  await expect(page.getByText("ChatGPT")).toBeVisible(); expect(state.creates()).toBe(1);
});

for (const status of [400, 403, 404, 409]) {
  test(`approval rejection ${status} provides recovery without silently recreating`, async ({ page }) => {
    const state = await setup(page);
    await page.route("**/api/identity/oauth/requests/server-id/approve", (route) => route.fulfill({ status, json: { message: "must-not-display" } }));
    await page.goto(entry);
    const region = page.getByRole("region", { name: "外部アプリへの接続" });
    await expect(region.getByText("ChatGPT")).toBeVisible();
    await region.getByLabel(/wiki:read/).check();
    await region.getByRole("button", { name: "承認", exact: true }).click();
    await expect(region.getByRole("alert")).toBeVisible();
    await expect(region.getByRole("button", { name: "認可をやり直す" })).toBeVisible();
    expect(state.creates()).toBe(1);
    if (status === 400) await expect(region.getByLabel(/wiki:read/)).not.toBeChecked();
    else await expect(region.getByRole("button", { name: "承認", exact: true })).toBeDisabled();
  });
}
