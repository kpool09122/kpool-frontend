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
  await expect(region.getByRole("link", { name: "許可する操作を設定" })).toHaveAttribute("href", "/admin/user/external-connections");
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
  // A fresh authenticated entry remains supported in addition to the login-button flows below.
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: identity })); await page.goto(entry);
  await expect(page.getByText("ChatGPT")).toBeVisible(); expect(state.creates()).toBe(1);
});

// External identity providers and WebAuthn are fixture boundaries, not live-service evidence.
async function loginFlow(page: Page, method: "passkey" | "google" | "line" | "kakao", scopes?: string[]) {
  const state = await setup(page, scopes);
  let authenticated = false;
  const events: string[] = [];
  await page.route("**/api/identity/auth/me", (route) => authenticated
    ? route.fulfill({ json: identity }) : route.fulfill({ status: 401 }));
  await page.route("**/api/identity/auth/csrf-token", (route) => {
    if (authenticated) events.push("csrf");
    return route.fulfill({ status: 204, headers: { "Set-Cookie": "XSRF-TOKEN=post-login-token; Path=/; SameSite=Lax" } });
  });
  await page.route("**/api/identity/oauth/requests", async (route) => {
    expect(authenticated).toBe(true);
    expect(events.at(-1)).toBe("csrf");
    expect(route.request().headers()["x-xsrf-token"]).toBe("post-login-token");
    expect(route.request().postDataJSON()).toEqual({
      clientIdentifier: params.get("client_id"), redirectUri: params.get("redirect_uri"),
      scopes: params.get("scope")!.split(" "), resource: params.get("resource"),
      codeChallenge: params.get("code_challenge"), codeChallengeMethod: "S256",
      responseType: "code", state: params.get("state"),
    });
    events.push("create");
    // This override records creation order; setup still owns approve/deny assertions.
    await route.fulfill({ status: 201, json: { requestIdentifier: "server-id", expiresAt: new Date(Date.now() + 600000).toISOString() } });
  });
  await page.route("**/api/identity/oauth/requests/server-id", async (route) => {
    expect(events.at(-1)).toBe("create"); events.push("details");
    await route.fulfill({ json: { requestIdentifier: "server-id", expiresAt: new Date(Date.now() + 600000).toISOString(), clientName: "ChatGPT", scopes: (scopes ?? ["wiki:read", "wiki-drafts:write"]).map((scope) => ({ scope, description: scope })) } });
  });
  if (method === "passkey") {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.credentials, "get", { value: async () => {
        const response = Object.create(AuthenticatorAssertionResponse.prototype);
        Object.defineProperties(response, { clientDataJSON: { value: new ArrayBuffer(1) }, authenticatorData: { value: new ArrayBuffer(1) }, signature: { value: new ArrayBuffer(1) }, userHandle: { value: null } });
        const credential = Object.create(PublicKeyCredential.prototype);
        Object.defineProperties(credential, { id: { value: "credential" }, rawId: { value: new ArrayBuffer(1) }, response: { value: response }, authenticatorAttachment: { value: "platform" }, getClientExtensionResults: { value: () => ({}) } });
        return credential;
      } });
    });
    await page.route("**/api/identity/auth/passkeys/authentication/options", (route) => route.fulfill({ json: { challengeKey: "44444444-4444-4444-8444-444444444444", options: { challenge: "YQ", timeout: 60000, rpId: "127.0.0.1", allowCredentials: [], userVerification: "preferred" } } }));
    await page.route("**/api/identity/auth/passkeys/authentication", (route) => { authenticated = true; return route.fulfill({ json: identity }); });
  } else {
    await page.route(`**/api/identity/auth/social/${method}/redirect?*`, async (route) => {
      const returnTo = new URL(route.request().url()).searchParams.get("return_to")!;
      expect(new URL(returnTo, "http://localhost").searchParams.get("authReturnTo")).toBe(entry);
      authenticated = true;
      // The SSR admin callback reads the repository's mock-session cookie, not page.route auth/me.
      await page.context().addCookies([{ name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" }]);
      return route.fulfill({ json: { redirectUrl: returnTo } });
    });
  }
  await page.goto(entry);
  const region = page.getByRole("region", { name: "外部アプリへの接続" });
  await region.getByRole("link", { name: "ログイン", exact: true }).click();
  expect(events).toEqual([]); expect(state.creates()).toBe(0);
  const labels: Record<string, string> = { passkey: "パスキー", google: "Google", line: "LINE", kakao: "Kakao" };
  await page.getByRole("button", { name: `${labels[method]}でログイン` }).click();
  await expect(page).toHaveURL(entry);
  await expect(region.getByText("ChatGPT")).toBeVisible();
  expect(events).toEqual(["csrf", "create", "details"]);
  expect(state.selected()).toBeNull();
  return { region, state, events, expire: () => { authenticated = false; } };
}
for (const method of ["passkey", "google", "line", "kakao"] as const) {
  test(`signed-out ${method} login preserves OAuth parameters and requires explicit consent`, async ({ page }) => {
    const { region, state } = await loginFlow(page, method);
    await expect(region.getByRole("checkbox")).toHaveCount(2);
    await expect(region.getByRole("button", { name: "承認", exact: true })).toBeDisabled();
    await region.getByLabel(/wiki:read/).check();
    await region.getByRole("button", { name: "承認", exact: true }).click();
    await expect(page).toHaveURL("https://client.example/callback?code=code&state=original");
    expect(state.selected()).toEqual({ scopes: ["wiki:read"] });
  });
}
test("login with no permitted scopes cannot approve and can explicitly cancel", async ({ page }) => {
  const { region } = await loginFlow(page, "passkey", []);
  await expect(region.getByRole("button", { name: "承認", exact: true })).toHaveCount(0);
  await region.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(page).toHaveURL("https://client.example/callback?error=access_denied&state=original");
});

test("expired login resumes the original authorization with fresh CSRF and explicit new consent", async ({ page }) => {
  const flow = await loginFlow(page, "passkey");
  await page.route("**/api/identity/oauth/requests/server-id/approve", (route) => route.fulfill({ status: 419 }));
  await flow.region.getByLabel(/wiki:read/).check();
  await flow.region.getByRole("button", { name: "承認", exact: true }).click();
  const login = flow.region.getByRole("link", { name: "ログイン", exact: true });
  await expect(login).toHaveAttribute("href", `/login?returnTo=${encodeURIComponent(entry)}`);
  flow.expire();
  await login.click();
  await page.getByRole("button", { name: "パスキーでログイン" }).click();
  await expect(page).toHaveURL(entry);
  await expect(flow.region.getByText("ChatGPT")).toBeVisible();
  await expect(flow.region.getByLabel(/wiki:read/)).not.toBeChecked();
  await expect(flow.region.getByRole("button", { name: "承認", exact: true })).toBeDisabled();
  expect(flow.events).toEqual(["csrf", "create", "details", "csrf", "create", "details"]);
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
