import { expect, test } from "./fixtures";

const browserIdentity = {
  accountPrincipalStatus: "active",
  siteManagementPrincipalStatus: "active",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountIdentifier: "22222222-2222-2222-2222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
  siteManagementPrincipalIdentifier: "44444444-4444-4444-4444-444444444444",
  siteManagementPrincipalCount: 2,
  accountType: "individual",
  accountIdentityCount: 3,
  accountPolicies: [
    {
      policyIdentifier: "99999999-9999-4999-8999-999999999996",
      name: "Manager",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["account:principal-group:manage"],
          resourceTypes: ["ACCOUNT"],
          condition: null,
        },
      ],
    },
  ],
  account: {
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    email: "member@example.com",
    name: "Member Account",
    status: "active",
    type: "individual",
    accountCategory: "general",
    phone: null,
    address: null,
  },
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  siteManagementPolicies: [
    {
      policyIdentifier: "55555555-5555-4555-8555-555555555555",
      name: "Administrator",
      statements: [
        {
          effect: "allow",
          actions: ["principal-group:manage"],
          resourceTypes: ["principal_group"],
          condition: null,
        },
      ],
    },
  ],
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/identity/auth/me", async (route) => {
    const cookies = await page.context().cookies();
    const value = (name: string) =>
      cookies.find((cookie) => cookie.name === name)?.value ?? "active";
    return route.fulfill({
      json: {
        ...browserIdentity,
        accountPrincipalStatus: value("kpool-e2e-account-principal-status"),
        siteManagementPrincipalStatus: value("kpool-e2e-site-principal-status"),
      },
    });
  });
  await page.route("**/api/wiki/principal/me", async (route) => {
    const mode = (await page.context().cookies()).find(
      (cookie) => cookie.name === "kpool-e2e-wiki-principal",
    )?.value;
    return route.fulfill({
      json: {
        principalIdentifier: "33333333-3333-3333-3333-333333333333",
        identityIdentifier: browserIdentity.identityIdentifier,
        accountPrincipalCount: 3,
        isDelegatedPrincipal: false,
        status:
          mode === "suspended" || mode === "forced_stop" ? mode : "active",
        policies: [
          {
            policyIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            name: "Manager",
            isSystemPolicy: true,
            statements: [
              {
                effect: "allow",
                actions: ["principal-group:manage"],
                resourceTypes: ["principal_group"],
                condition: null,
              },
            ],
          },
        ],
      },
    });
  });
});

// Browser contract tests; backend transactions require a separate live integration environment.
const account = "22222222-2222-2222-2222-222222222222";
const groupId = "66666666-6666-4666-8666-666666666666";
const users = ["active", "suspended", "forced_stop"].map((status, i) => ({
  principalIdentifier: `${i + 1}1111111-1111-4111-8111-111111111111`,
  identityIdentifier: `${i + 1}2222222-2222-4222-8222-222222222222`,
  identityName: `Principal ${i}`,
  email: `user${i}@example.test`,
  status,
  principalGroups: [],
}));
const group = {
  principalGroupIdentifier: groupId,
  accountIdentifier: account,
  name: "Managers",
  description: "Manages users",
  isDefault: false,
  roleIdentifiers: [],
  isMembershipEditable: true,
  members: [],
};
for (const context of ["account", "wiki", "site-management"] as const) {
  test(`${context}: stage statuses, keep forced-stop, and atomically save/resume with groups`, async ({
    page,
  }) => {
    await page.context().addCookies([
      ...[
        ["kpool-mock-account-status", "active"],
        ["kpool-locale", "ja"],
        ["kpool-e2e-principal-management", "1"],
        ["kpool-e2e-site-management", "administrator"],
        ["kpool-e2e-wiki-principal", "principal-manager"],
      ].map(([name, value]) => ({
        name,
        value,
        domain: "127.0.0.1",
        path: "/",
      })),
    ]);
    let current = users.map((user) => ({ ...user }));
    let writes = 0;
    const defaultGroup = () => ({
      ...group,
      principalGroupIdentifier: "77777777-7777-4777-8777-777777777777",
      name: "General",
      members: current,
    });
    const data = () => ({
      principalGroups: [group, ...(context === "wiki" ? [defaultGroup()] : [])],
      principals: current,
      members: current,
    });
    await page.route(`**/api/${context}/principal-groups?*`, (route) =>
      route.fulfill({ json: data() }),
    );
    await page.route(`**/api/${context}/principal-groups`, (route) =>
      route.fulfill({ json: data() }),
    );
    if (context === "account")
      await page.route("**/api/account/members", (route) =>
        route.fulfill({ json: data() }),
      );
    await page.route(`**/api/${context}/principal-groups/members`, (route) => {
      const payload = route.request().postDataJSON();
      writes++;
      expect(payload.principalStatuses).toEqual(
        current.map((user, i) => ({
          principalIdentifier: user.principalIdentifier,
          status: i === 1 ? "active" : user.status,
        })),
      );
      expect(payload.principalGroups).toEqual([
        {
          principalGroupIdentifier: groupId,
          principalIdentifiers: [users[1].principalIdentifier],
        },
        ...(context === "wiki"
          ? [
              {
                principalGroupIdentifier:
                  defaultGroup().principalGroupIdentifier,
                principalIdentifiers: current.map(
                  (user) => user.principalIdentifier,
                ),
              },
            ]
          : []),
      ]);
      current = current.map((user, i) =>
        i === 1 ? { ...user, status: "active" } : user,
      );
      return route.fulfill({
        json: {
          committed: true,
          refresh: {
            ok: true,
            data: {
              ...data(),
              principalGroups: [
                { ...group, members: [current[1]] },
                ...(context === "wiki" ? [defaultGroup()] : []),
              ],
            },
          },
        },
      });
    });
    await page.goto(`/admin/${context}/principal-groups`);
    await expect(page.getByText("Principal 2", { exact: true })).toBeVisible();
    const forced = page.getByRole("article").filter({ hasText: "Principal 2" });
    await expect(forced.getByText("強制停止", { exact: true })).toBeVisible();
    await expect(forced.getByRole("switch", { name: "ステータス", exact: true })).toBeDisabled();
    await expect(forced.getByRole("switch", { name: "ステータス", exact: true })).not.toBeChecked();
    const resumed = page.getByRole("article").filter({ hasText: "Principal 1" });
    const statusToggle = resumed.getByRole("switch", { name: "ステータス", exact: true });
    await expect(statusToggle).not.toBeChecked();
    await statusToggle.click();
    await expect(statusToggle).toBeChecked();
    expect(writes).toBe(0);
    await resumed.getByRole("button", { name: "所属グループを編集", exact: true }).click();
    await page.getByRole("checkbox", { name: "Managers", exact: true }).check();
    await page.getByRole("button", { name: "確定", exact: true }).click();
    expect(writes).toBe(0);
    await expect(
      page.getByRole("button", { name: "変更を保存", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "変更を保存", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "変更を保存", exact: true }),
    ).toBeDisabled();
    await expect.poll(() => writes).toBe(1);
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: "Principal 1" })
        .getByText("有効", { exact: true }),
    ).toBeVisible();
    await expect(forced.getByText("強制停止", { exact: true })).toBeVisible();
  });
}
for (const status of ["suspended", "forced_stop"])
  for (const context of ["account", "wiki", "site-management"]) {
    test(`${context}: direct stopped ${status} access redirects to the first visible section`, async ({
      page,
    }) => {
      const cookies = [
        ["kpool-mock-account-status", "active"],
        ["kpool-locale", "ja"],
        ["kpool-e2e-principal-management", "1"],
        ["kpool-e2e-site-management", "administrator"],
        [
          "kpool-e2e-wiki-principal",
          context === "wiki" ? status : "principal-manager",
        ],
        [
          context === "site-management"
            ? "kpool-e2e-site-principal-status"
            : "kpool-e2e-account-principal-status",
          context === "wiki" ? "active" : status,
        ],
      ];
      await page.context().addCookies(
        cookies.map(([name, value]) => ({
          name,
          value,
          domain: "127.0.0.1",
          path: "/",
        })),
      );
      await page.goto(`/admin/${context}/principal-groups`);
      const destination = context === "account"
        ? "/admin/user/profile"
        : context === "wiki" ? "/admin/site-management/contacts" : "/admin/wiki/editing";
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      const sidebar = page.getByRole("complementary", { name: "管理画面メニュー" });
      const stoppedMenu = context === "account" ? "アカウント設定" : context === "wiki" ? "Wiki" : "サイト管理";
      await expect(sidebar.getByRole("link", { name: stoppedMenu, exact: true })).toHaveCount(0);
      await expect(sidebar.getByRole("link", { name: "ユーザー設定", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "変更を保存", exact: true })).toHaveCount(0);
      await sidebar.getByRole("link", { name: "ユーザー設定", exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/user\/profile$/);
    });
  }
