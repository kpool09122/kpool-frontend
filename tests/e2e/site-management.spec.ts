import { expect, test } from "./fixtures";

// Browser/BFF contract fixtures only; these do not verify a live backend.
const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111", identityName: "member", email: "member@example.com", language: "ja",
  accountIdentifier: "22222222-2222-2222-2222-222222222222", accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333", siteManagementPrincipalIdentifier: "44444444-4444-4444-4444-444444444444",
  accountType: "individual", accountIdentityCount: 1, accountPolicies: [], account: { accountIdentifier: "22222222-2222-2222-2222-222222222222", email: "member@example.com", name: "Member Account", status: "active", type: "individual", accountCategory: "general", phone: null, address: null }, originalAccount: null, delegationIdentifier: null, switchableAccounts: [],
  siteManagementPolicies: [{ policyIdentifier: "55555555-5555-4555-8555-555555555555", name: "Administrator", statements: [{ effect: "allow", actions: ["principal-group:manage"], resourceTypes: ["principal_group"], condition: null }] }],
};
test("SiteManagement saves memberships and adopts the authoritative list", async ({ page }) => {
  await page.context().addCookies([{ name: "kpool-e2e-site-management", value: "administrator", domain: "127.0.0.1", path: "/" }, { name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" }, { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: identity }));
  const principal = { principalIdentifier: identity.siteManagementPrincipalIdentifier, identityIdentifier: identity.identityIdentifier, identityName: "Unassigned user", email: "member@example.com" };
  const group = { principalGroupIdentifier: "66666666-6666-4666-8666-666666666666", accountIdentifier: identity.accountIdentifier, name: "General", description: "Views their own inquiries.", roleIdentifiers: [], isDefault: false, members: [] };
  let mutations = 0;
  await page.route("**/api/site-management/principal-groups", (route) => route.fulfill({ json: { principalGroups: [group], principals: [principal] } }));
  await page.route("**/api/site-management/principal-groups/members", (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().postDataJSON()).toEqual({ principalGroups: [{ principalGroupIdentifier: group.principalGroupIdentifier, principalIdentifiers: [principal.principalIdentifier] }] });
    mutations += 1;
    return route.fulfill({ json: { committed: true, refresh: { ok: true, data: { principalGroups: [{ ...group, name: "Latest General", members: [principal] }], principals: [principal] } } } });
  });
  await page.goto("/admin/site-management/principal-groups");
  await expect(page.getByRole("heading", { name: "ユーザー権限管理", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "サイト管理" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Unassigned user", { exact: true })).toBeVisible();
  await expect(page.getByText("未所属", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "所属グループを編集" }).click();
  await expect(page.getByText(group.description, { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "General", exact: true })).toHaveAccessibleDescription(group.description);
  await page.getByRole("checkbox", { name: "General", exact: true }).check();
  await page.getByRole("button", { name: "確定", exact: true }).click();
  await expect(page.getByText("未保存の所属変更があります。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByText("ユーザー権限を保存しました。", { exact: true })).toBeVisible();
  await expect(page.getByText("Latest General", { exact: true })).toBeVisible();
  await expect(page.getByText("未保存の所属変更があります。", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "変更を保存", exact: true })).toBeDisabled();
  expect(mutations).toBe(1);
});
test("direct SiteManagement URL denies a Principal without management policies", async ({ page }) => {
  await page.context().addCookies([{ name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" }, { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/admin/site-management/principal-groups");
  await expect(page.getByText("ユーザー権限管理の権限がありません。", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "サイト管理" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Wiki collaborator を有効化" })).toHaveCount(0);
});
