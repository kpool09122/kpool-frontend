import { expect, test, type Page } from "./fixtures";
import {
  mockAccountNotificationPolicyCookieName,
  mockAccountPolicyCookieName,
  mockAccountStatusCookieName,
} from "@/gateways/identity/authIdentity";
const accountId = "22222222-2222-2222-2222-222222222222";
const candidates = Array.from({ length: 6 }, (_, index) => ({
  identityIdentifier: `00000000-0000-4000-8000-00000000000${index}`,
  name: `Member ${index}`,
  email: `member${index}@example.com`,
  language: "ja",
}));
const setup = async (page: Page, actions: string[]) => {
  let recipients = [
    { identityIdentifier: candidates[0].identityIdentifier, channel: "email" },
  ];
  await page.context().addCookies([
    {
      name: mockAccountNotificationPolicyCookieName,
      value: actions.includes("account:notification-settings:update")
        ? "update"
        : actions.includes("account:notification-settings:read")
          ? "read"
          : "none",
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: mockAccountPolicyCookieName,
      value: "update",
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: mockAccountStatusCookieName,
      value: "active",
      domain: "127.0.0.1",
      path: "/",
    },
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
  ]);
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({
      json: {
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
        profileImage: null,
        accountIdentifier: accountId,
        accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
        accountPrincipalStatus: "active" as const,
        siteManagementPrincipalStatus: "active" as const,
        accountType: "corporation",
        accountPolicies: [
          {
            policyIdentifier: "99999999-9999-9999-9999-999999999999",
            name: "CUSTOM_NOTIFICATION",
            isSystemPolicy: false,
            statements: [
              { effect: "allow", actions, resourceTypes: ["ACCOUNT"] },
            ],
          },
        ],
        accountIdentityCount: 6,
        originalAccount: null,
        delegationIdentifier: null,
        switchableAccounts: [],
        authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
        account: {
          accountIdentifier: accountId,
          name: "Member Account",
          email: "member@example.com",
          type: "corporation",
          status: "active",
          accountCategory: "general",
        },
      },
    }),
  );
  await page.route(
    `**/api/account/accounts/${accountId}/notification-settings`,
    async (route) => {
      if (route.request().method() === "PUT") {
        recipients = route.request().postDataJSON().recipients;
        expect(
          recipients.every((recipient) => recipient.channel === "email"),
        ).toBe(true);
        await route.fulfill({ json: [] });
      } else
        await route.fulfill({
          json: { candidates, recipients, maxRecipients: 5 },
        });
    },
  );
};
test("custom policy allows limit, save, reload and zero recipients on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, [
    "account:notification-settings:read",
    "account:notification-settings:update",
  ]);
  await page.goto("/admin/account/notification-settings");
  await expect(
    page.getByRole("checkbox", { name: "Member 0" }),
  ).toBeChecked();
  await expect(page.getByRole("button", { name: "管理画面メニューを開く" })).toHaveAttribute("aria-expanded", "false");
  const firstRecipient = page.getByRole("checkbox", { name: "Member 0" });
  await firstRecipient.click({ position: { x: 8, y: 8 } });
  await expect(firstRecipient).not.toBeChecked();
  await page.getByRole("radio", { name: "メール: member0@example.com" }).check();
  await expect(firstRecipient).toBeChecked();

  for (let i = 1; i < 5; i++)
    await page
      .getByRole("checkbox", { name: `Member ${i}` })
      .check({ position: { x: 8, y: 8 } });
  await expect(
    page.getByRole("checkbox", { name: "Member 5" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("radio", { name: "LINE", exact: true }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("radio", { name: "Kakao", exact: true }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("通知設定を保存しました。")).toBeVisible();
  await page.reload();
  for (let i = 0; i < 5; i++)
    await expect(
      page.getByRole("checkbox", { name: `Member ${i}` }),
    ).toBeChecked();
  await expect(page.getByRole("button", { name: "管理画面メニューを開く" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "全解除" }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  for (let i = 0; i < 6; i++)
    await expect(
      page.getByRole("checkbox", { name: `Member ${i}` }),
    ).not.toBeChecked();
  await expect(page.getByText("通知設定を保存しました。")).toBeVisible();
  await page.reload();
  for (let i = 0; i < 6; i++)
    await expect(
      page.getByRole("checkbox", { name: `Member ${i}` }),
    ).not.toBeChecked();
});
test("read-only access displays disabled controls", async ({ page }) => {
  await setup(page, ["account:notification-settings:read"]);
  await page.goto("/admin/account/notification-settings");
  await expect(
    page.getByRole("checkbox", { name: "Member 0" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "保存", exact: true }),
  ).toBeDisabled();
});
test("general permissions do not allow direct access", async ({ page }) => {
  await setup(page, ["account:read", "account:update"]);
  await page.goto("/admin/account/notification-settings");
  await expect(page).toHaveURL(/\/admin\/account\/profile$/);
  await expect(page.getByRole("tab", { name: "通知設定" })).toHaveCount(0);
});
