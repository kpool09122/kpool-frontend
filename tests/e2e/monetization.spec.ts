import { expect, test } from "./fixtures";
import { dictionaries } from "../../src/i18n/dictionaries";
import type { Locale } from "../../src/i18n/locales";
const actor = "11111111-1111-1111-1111-111111111111";
const account = "22222222-2222-2222-2222-222222222222";
const principalId = "33333333-3333-3333-3333-333333333333";
const groupId = "66666666-6666-4666-8666-666666666666";
const identity = { identityIdentifier: actor, identityName: "member", email: "member@example.com", language: "ja", accountIdentifier: account, accountPrincipalIdentifier: principalId, accountPrincipalStatus: "active", accountIdentityCount: 2, accountType: "individual", accountPolicies: [], siteManagementPrincipalStatus: "active", siteManagementPolicies: [], account: { accountIdentifier: account, name: "Member Account", email: "member@example.com", status: "active", type: "individual", accountCategory: "general", phone: null, address: null }, originalAccount: null, delegationIdentifier: null, switchableAccounts: [] };
const principal = { principalIdentifier: principalId, identityIdentifier: actor, status: "active", accountPrincipalCount: 2, policies: [{ policyIdentifier: groupId, name: "Owner", statements: [{ effect: "allow", actions: ["principal_group_manage"], resourceTypes: ["principal_group"], condition: null }] }] };
const member = { principalIdentifier: principalId, identityIdentifier: actor, identityName: "Member", email: "member@example.com", status: "active" };
const successor = { ...member, principalIdentifier: "77777777-7777-4777-8777-777777777777", identityName: "Successor", email: "successor@example.com" };
for (const [locale, menu, activate, manage, save, saved, status] of [
  ["ja", "支払い・受け取り設定", "利用を開始する", "ユーザー権限管理", "変更を保存", "変更を保存しました。", "ステータス"],
  ["en", "Payments and payouts", "Get started", "User permissions", "Save changes", "Changes saved.", "Status"],
  ["ko", "결제·수취 설정", "이용 시작", "사용자 권한 관리", "변경 사항 저장", "변경 사항을 저장했습니다.", "상태"],
]) for (const width of [1280, 390]) test(`${locale} ${width}px: fresh direct load, explicit activation and atomic management`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([ ...[["kpool-mock-account-status", "active"], ["kpool-locale", locale]].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" })) ]);
  await page.route("**/api/identity/auth/me", route => route.fulfill({ json: { ...identity, language: locale } }));
  let enabled = false, writes = 0;
  const groups = [{ principalGroupIdentifier: groupId, accountIdentifier: account, name: "Owners", description: "Manage this account", isDefault: false, roleIdentifiers: [groupId], members: [member] }];
  let users = [member, successor];
  await page.route("**/api/monetization/principal/me", route => route.fulfill({ status: enabled ? 200 : 404, json: enabled ? principal : {} }));
  await page.route("**/api/monetization/principals", route => { enabled = true; return route.fulfill({ status: 201, json: { principalIdentifier: principalId, identityIdentifier: actor } }); });
  await page.route("**/api/monetization/principal-groups", route => route.fulfill({ json: { groups, users } }));
  await page.route("**/api/monetization/principal-groups/members", route => {
    const body = route.request().postDataJSON(); writes++;
    expect(body.principalGroups).toEqual([{ principalGroupIdentifier: groupId, principalIdentifiers: [principalId, successor.principalIdentifier] }]);
    expect(body.principalStatuses).toEqual([{ principalIdentifier: principalId, status: "suspended" }, { principalIdentifier: successor.principalIdentifier, status: "active" }]);
    users = users.map(user => ({ ...user, status: user.principalIdentifier === principalId ? "suspended" : "active" }));
    return route.fulfill({ json: { committed: true, refresh: { ok: true, data: { groups: [{ ...groups[0], members: users }], users } } } });
  });
  await page.goto("/admin/monetization");
  await expect(page.getByRole("heading", { name: menu, exact: true })).toBeVisible();
  const headingBox = await page.getByRole("heading", { name: menu, exact: true }).boundingBox();
  const toggleBox = await page.locator("aside > button").boundingBox();
  expect(headingBox!.x).toBeGreaterThanOrEqual(toggleBox!.x + toggleBox!.width);
  await expect(page.getByRole("button", { name: activate, exact: true })).toBeVisible(); expect(enabled).toBe(false);
  await page.getByRole("button", { name: activate, exact: true }).click();
  await expect(page.getByRole("tab", { name: manage, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: activate, exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: manage, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/monetization\/principal-groups$/);
  await expect(page.getByRole("heading", { name: manage, exact: true })).toBeVisible();
  const text = dictionaries[locale as Locale].admin;
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "Successor", exact: true }) }).getByRole("button", { name: text.wikiPrincipalGroupEditUserGroups }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: "Owners", exact: true }).check();
  await page.getByRole("button", { name: text.wikiPrincipalGroupDialogConfirm, exact: true }).click();
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "Member", exact: true }) }).getByRole("switch", { name: status, exact: true }).click();
  await page.getByRole("button", { name: save, exact: true }).click(); await expect(page.getByText(saved, { exact: true })).toBeVisible(); expect(writes).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`issue675-${locale}-${width}.png`), fullPage: true });
});

for (const width of [1280, 390]) test(`${width}px: hides settings for a non-manager and redirects direct access`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" },
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
  ]);
  await page.route("**/api/identity/auth/me", route => route.fulfill({ json: identity }));
  await page.route("**/api/monetization/principal/me", route => route.fulfill({ json: { ...principal, policies: [] } }));
  const access = page.waitForResponse("**/api/monetization/principal/me");
  await page.goto("/admin/wiki/editing");
  await access;
  await expect(page.getByRole("link", { name: dictionaries.ja.admin.monetizationMenu, exact: true })).toHaveCount(0);
  for (const path of ["/admin/monetization", "/admin/monetization/principal-groups"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/wiki\/editing$/);
    await expect(page.getByRole("link", { name: dictionaries.ja.admin.monetizationMenu, exact: true })).toHaveCount(0);
    await expect(page.getByText(dictionaries.ja.admin.monetization.noPermission, { exact: true })).toHaveCount(0);
  }
});

test("removes the sidebar entry and leaves settings after revoking own management access", async ({ page }) => {
  const text = dictionaries.ja.admin;
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" },
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
  ]);
  let revoked = false;
  const group = { principalGroupIdentifier: groupId, accountIdentifier: account, name: "Owners", description: "Manage this account", isDefault: false, roleIdentifiers: [groupId], members: [member, successor] };
  await page.route("**/api/identity/auth/me", route => route.fulfill({ json: identity }));
  await page.route("**/api/monetization/principal/me", route => route.fulfill({ json: revoked ? { ...principal, policies: [] } : principal }));
  await page.route("**/api/monetization/principal-groups", route => route.fulfill({ json: { groups: [group], users: [member, successor] } }));
  await page.route("**/api/monetization/principal-groups/members", route => {
    expect(route.request().postDataJSON().principalGroups).toEqual([{ principalGroupIdentifier: groupId, principalIdentifiers: [successor.principalIdentifier] }]);
    revoked = true;
    return route.fulfill({ json: { committed: true, refresh: { ok: true, data: { groups: [{ ...group, members: [successor] }], users: [member, successor] } } } });
  });
  await page.goto("/admin/monetization/principal-groups");
  await expect(page.getByRole("link", { name: text.monetizationMenu, exact: true })).toBeVisible();
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "Member", exact: true }) }).getByRole("button", { name: text.wikiPrincipalGroupEditUserGroups }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: "Owners", exact: true }).uncheck();
  await page.getByRole("button", { name: text.wikiPrincipalGroupDialogConfirm, exact: true }).click();
  await page.getByRole("button", { name: text.wikiPrincipalGroupSave, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/wiki\/editing$/);
  await expect(page.getByRole("link", { name: text.monetizationMenu, exact: true })).toHaveCount(0);
  await expect(page.getByText(text.monetization.noPermission, { exact: true })).toHaveCount(0);
});
