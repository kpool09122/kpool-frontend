import { expect, test } from "./fixtures";
const actor = "11111111-1111-1111-1111-111111111111";
const account = "22222222-2222-2222-2222-222222222222";
const principalId = "33333333-3333-3333-3333-333333333333";
const groupId = "66666666-6666-4666-8666-666666666666";
const identity = { identityIdentifier: actor, identityName: "member", email: "member@example.com", language: "ja", accountIdentifier: account, accountPrincipalIdentifier: principalId, accountPrincipalStatus: "active", accountIdentityCount: 2, accountType: "individual", accountPolicies: [], siteManagementPrincipalStatus: "active", siteManagementPolicies: [], account: { accountIdentifier: account, name: "Member Account", email: "member@example.com", status: "active", type: "individual", accountCategory: "general", phone: null, address: null }, originalAccount: null, delegationIdentifier: null, switchableAccounts: [] };
const principal = { principalIdentifier: principalId, identityIdentifier: actor, status: "active", accountPrincipalCount: 2, policies: [{ policyIdentifier: groupId, name: "Owner", statements: [{ effect: "allow", actions: ["principal_group_manage"], resourceTypes: ["principal_group"], condition: null }] }] };
const member = { principalIdentifier: principalId, identityIdentifier: actor, identityName: "Member", email: "member@example.com", status: "active" };
const successor = { ...member, principalIdentifier: "77777777-7777-4777-8777-777777777777", identityName: "Successor", email: "successor@example.com" };
for (const [locale, menu, activate, active, save, saved, status] of [
  ["ja", "支払い・受け取り設定", "利用を開始する", "利用中です。", "変更を一括保存", "変更を保存しました。", "ステータス"],
  ["en", "Payments and payouts", "Get started", "Monetization is enabled.", "Save all changes", "Changes saved.", "Status"],
  ["ko", "결제·수취 설정", "이용 시작", "이용 중입니다.", "변경 사항 일괄 저장", "변경 사항을 저장했습니다.", "상태"],
]) for (const width of [1280, 390]) test(`${locale} ${width}px: fresh direct load, explicit activation and atomic management`, async ({ page }) => {
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
  await page.getByRole("button", { name: activate, exact: true }).click(); await expect(page.getByText(active, { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Successor: Owners", exact: true }).check();
  await page.getByRole("combobox", { name: `Member: ${status}`, exact: true }).selectOption("suspended");
  await page.getByRole("button", { name: save, exact: true }).click(); await expect(page.getByText(saved, { exact: true })).toBeVisible(); expect(writes).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `/private/tmp/issue675-${locale}-${width}.png`, fullPage: true });
});
