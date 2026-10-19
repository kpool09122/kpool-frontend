import { expect, test } from "./fixtures";

// Browser/BFF contract fixtures only; these do not verify a live backend.
const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111", identityName: "member", email: "member@example.com", language: "ja",
  accountIdentifier: "22222222-2222-2222-2222-222222222222", accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333", siteManagementPrincipalIdentifier: "44444444-4444-4444-4444-444444444444",
  siteManagementPrincipalCount: 2,
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
  await expect(page.getByText("利用できるサービスがありません。", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "サイト管理" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "ユーザー権限管理" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "ユーザー権限管理", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Wiki collaborator を有効化" })).toHaveCount(0);
});
test("a single SiteManagement Principal keeps the entry but hides management and API requests", async ({ page }) => {
  await page.context().addCookies([
    { name: "kpool-e2e-site-management", value: "administrator", domain: "127.0.0.1", path: "/" },
    { name: "kpool-e2e-site-management-principal-count", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" },
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
  ]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: { ...identity, siteManagementPrincipalCount: 1 } }));
  let managementRequests = 0;
  await page.route("**/api/site-management/principal-groups**", (route) => {
    managementRequests += 1;
    return route.fulfill({ status: 500, json: { message: "Management should not load for one principal" } });
  });
  await page.goto("/admin/site-management/principal-groups");
  await expect(page.getByText("利用できるサービスがありません。", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "サイト管理" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("tab", { name: "ユーザー権限管理" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "ユーザー権限管理", exact: true })).toHaveCount(0);
  expect(managementRequests).toBe(0);
});


test("announcement draft create, edit, translate, publish and delete", async ({ page }) => {
 const actions = ["view-draft", "create", "update", "translate", "publish", "delete"].map((action) => `announcement:${action}`);
 const operator = { ...identity, siteManagementPolicies: [{ ...identity.siteManagementPolicies[0], name: "Operator", statements: [{ effect: "allow", actions, resourceTypes: ["announcement"], condition: null }] }] };
 await page.context().addCookies([{ name: "kpool-e2e-site-management", value: "operator", domain: "127.0.0.1", path: "/" }, { name: "kpool-mock-account-status", value: "active", domain: "127.0.0.1", path: "/" }, { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" }]);
 await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: operator }));
 const id = "019b0000-0000-7000-8000-000000000001";
 type Draft = { announcementIdentifier: string; sourceLanguage: string; category: number; contents: Record<string, { title: string; content: string }> };
 let draft: Draft | null = null;
 let writes = 0;
 await page.route("**/api/site-management/draft-announcements**", (route) => {
  const url = new URL(route.request().url()); const method = route.request().method();
  if (method === "GET") return route.fulfill({ json: url.pathname.endsWith("draft-announcements") ? { announcements: draft ? [draft] : [], current_page: 1, last_page: 1, per_page: 20, total: draft ? 1 : 0 } : draft });
  writes += 1;
  if (url.pathname.endsWith("/translate")) { draft!.contents.en = { title: "English", content: "English body" }; draft!.contents.ko = { title: "한국어", content: "본문" }; return route.fulfill({ json: { announcements: [draft] } }); }
  if (url.pathname.endsWith("/publish") || method === "DELETE") { const removed = url.pathname.endsWith("/publish") ? { ...draft, publishedDate: "2026-10-19" } : draft; draft = null; return route.fulfill({ json: { announcements: [removed] } }); }
  const input = route.request().postDataJSON();
  draft = { announcementIdentifier: id, sourceLanguage: draft?.sourceLanguage ?? input.language, category: input.category, contents: { ...draft?.contents, [input.language]: { title: input.title, content: input.content } } };
  return route.fulfill({ json: draft });
 });
 await page.goto("/admin/site-management/announcements");
 await expect(page.getByRole("tab", { name: "お知らせ管理" })).toBeVisible();
 await page.getByRole("button", { name: "新規作成", exact: true }).click();
 await expect(page.getByLabel("公開日", { exact: true })).toHaveCount(0);
 await page.getByLabel("タイトル", { exact: true }).fill("新しいお知らせ");
 const markdown = "## 本文見出し\n\n**重要**なお知らせ\n\n- 更新内容";
 await page.getByLabel("本文", { exact: true }).fill(markdown);
 await expect(page.getByRole("heading", { name: "本文見出し" })).toBeVisible();
 await page.setViewportSize({ width: 390, height: 844 });
 await page.getByRole("button", { name: "管理画面メニューを閉じる", exact: true }).click();
 await expect(page.getByRole("heading", { name: "本文見出し" })).not.toBeVisible();
 await page.getByRole("tab", { name: "プレビュー", exact: true }).click();
 await expect(page.getByRole("heading", { name: "本文見出し" })).toBeVisible();
 await expect(page.getByLabel("本文", { exact: true })).not.toBeVisible();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
 await page.getByRole("tab", { name: "編集", exact: true }).click();
 await expect(page.getByLabel("本文", { exact: true })).toHaveValue(markdown);
 await page.setViewportSize({ width: 1280, height: 900 });
 await page.getByRole("button", { name: "新規作成", exact: true }).click();
 await expect(page.getByText("保存しました。", { exact: true })).toBeVisible();
 await page.getByLabel("タイトル", { exact: true }).fill("手動編集");
 await expect(page.getByRole("button", { name: "翻訳", exact: true })).toBeDisabled();
 await page.getByRole("button", { name: "保存", exact: true }).click();
 await expect(page.getByRole("button", { name: "翻訳", exact: true })).toBeEnabled();
 await page.getByRole("button", { name: "翻訳", exact: true }).click();
 await expect(page.getByText("未翻訳の言語を補完しました。", { exact: true })).toBeVisible();
 await expect(page.getByLabel("タイトル", { exact: true })).toHaveValue("手動編集");
 await page.getByLabel("表示言語", { exact: true }).selectOption("en");
 await expect(page.getByLabel("タイトル", { exact: true })).toHaveValue("English");
 page.on("dialog", (dialog) => dialog.accept());
 await page.getByRole("button", { name: "公開", exact: true }).click();
 await expect(page.getByText("公開しました。", { exact: true })).toBeVisible();
 await expect(page.getByText("編集中のお知らせはありません。", { exact: true })).toBeVisible();
 // Reopen a separate draft and verify deletion confirmation + authoritative removal.
 draft = { announcementIdentifier: id, sourceLanguage: "ja", category: 1, contents: { ja: { title: "削除する下書き", content: "本文" } } };
 await page.reload();
 await page.getByRole("button", { name: "削除する下書き", exact: true }).click();
 await page.getByRole("button", { name: "削除", exact: true }).click();
 await expect(page.getByText("削除しました。", { exact: true })).toBeVisible();
 expect(writes).toBe(5);
});
