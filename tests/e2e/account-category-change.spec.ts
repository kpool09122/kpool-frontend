import { expect, test, type Page } from "./fixtures";
import {
  mockAccountPolicyCookieName,
  mockAccountStatusCookieName,
} from "@/gateways/identity/authIdentity";
import type { AccountCategoryChangeRequestSummary } from "@/gateways/account/accountApi";

const accountIdentifier = "22222222-2222-2222-2222-222222222222";
const account = {
  accountIdentifier,
  name: "Member Account",
  email: "member@example.com",
  type: "corporation",
  status: "active",
  accountCategory: "general",
};
const pending: AccountCategoryChangeRequestSummary = {
  requestIdentifier: "44444444-4444-4444-8444-444444444444",
  accountIdentifier,
  currentAccountCategory: "general",
  requestedAccountCategory: "agency",
  status: "pending",
  requestedAt: "2026-10-12T00:00:00Z",
};
const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
  email: account.email,
  language: "ja",
  profileImage: null,
  accountIdentifier,
  accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
  accountPrincipalStatus: "active" as const,
  siteManagementPrincipalStatus: "active" as const,
  accountType: "corporation",
  // Normal account settings access, but no operations category-change management policy.
  accountPolicies: [
    {
      policyIdentifier: "99999999-9999-9999-9999-999999999999",
      name: "ACCOUNT_ADMIN",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["account:update"],
          resourceTypes: ["ACCOUNT"],
        },
      ],
    },
  ],
  accountIdentityCount: 1,
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
  account,
};
async function setup(
  page: Page,
  initial: AccountCategoryChangeRequestSummary | null,
) {
  let latest = initial;
  await page.context().addCookies([
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
    route.fulfill({ json: identity }),
  );
  await page.route(`**/api/account/accounts/${accountIdentifier}`, (route) =>
    route.fulfill({
      json: {
        ...account,
        accountCategory: latest?.status === "approved" ? "agency" : "general",
      },
    }),
  );
  await page.route("**/category-change-requests/latest", (route) =>
    route.fulfill({ json: { request: latest } }),
  );
  await page.route("**/category-change-requests/*/withdraw", (route) => {
    latest = null;
    return route.fulfill({ json: { ...pending, status: "withdrawn" } });
  });
  await page.route(
    `**/api/account/accounts/${accountIdentifier}/category-change-requests`,
    async (route) => {
      expect(route.request().method()).toBe("POST");
      latest = {
        ...pending,
        requestIdentifier: "55555555-5555-4555-8555-555555555555",
        requestedAccountCategory: route.request().postDataJSON()
          .requestedAccountCategory,
      };
      await route.fulfill({ status: 201, json: latest });
    },
  );
  return (next: AccountCategoryChangeRequestSummary | null) => {
    latest = next;
  };
}

test("application, reload, withdrawal and reapplication without management permission", async ({
  page,
}) => {
  await setup(page, null);
  await page.goto("/admin/account/category-change");
  await page.getByRole("radio", { name: "タレント" }).check();
  await page.getByRole("button", { name: "申請する", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "申請を取り下げる" }),
  ).toBeEnabled();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(pending.requestedAt)).toBeVisible();
  await page.getByRole("button", { name: "申請を取り下げる" }).click();
  await expect(
    page.getByRole("button", { name: "申請する", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "申請する", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "申請を取り下げる" }),
  ).toBeEnabled();
});

test("mobile rejected form and approved authoritative category", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const setLatest = await setup(page, {
    ...pending,
    status: "rejected",
    rejectionReason: { code: "other", detail: "More detail required" },
  });
  await page.goto("/admin/account/category-change");
  await expect(page.getByText(/More detail required/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "申請する", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("radio")).toHaveCount(2);
  setLatest({ ...pending, status: "approved" });
  await page.reload();
  await expect(page.getByText("事務所", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "申請する", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "申請を取り下げる" }),
  ).toHaveCount(0);
});
