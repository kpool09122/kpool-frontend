import { expect, test, type Page } from "./fixtures";
import { mockAccountPolicyCookieName, mockAccountStatusCookieName } from "@/gateways/identity/authIdentity";
const accountIdentifier = "22222222-2222-2222-2222-222222222222";
const snapshotId = "66666666-6666-4666-8666-666666666666";
const requestId = "77777777-7777-4777-8777-777777777777";
const newSnapshotId = "88888888-8888-4888-8888-888888888888";
const savedAt = "2026-11-25T00:00:00Z";
const originalProfile = { name: "Original account", email: "member@example.com", type: "corporation", status: "active", phone: "0312345678", countryCode: "JP", administrativeAreaCode: "JP-13", postalCode: "1000000", locality: "Chiyoda", addressLine1: "Original address", addressLine2: null };
const documents = [{ documentType: "passport", uploadedAt: savedAt }];
async function setup(page: Page, operations = true) {
  await page.context().addCookies([
    { name: mockAccountPolicyCookieName, value: "update", domain: "127.0.0.1", path: "/" },
    { name: mockAccountStatusCookieName, value: "active", domain: "127.0.0.1", path: "/" },
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
    ...(operations ? [{ name: "kpool-e2e-account-review", value: "1", domain: "127.0.0.1", path: "/" }] : []),
  ]);
  let saved = false;
  let categoryStatus: "pending" | "approved" | null = null;
  let changeStatus: "pending" | "approved" | "rejected" | null = null;
  let profileName = originalProfile.name;
  const snapshot = () => ({ snapshotIdentifier: changeStatus === "approved" ? newSnapshotId : snapshotId, accountIdentifier, status: "approved", savedAt, isCurrent: true, account: { ...originalProfile, name: changeStatus === "approved" ? "Changed account" : originalProfile.name }, documents });
  const account = () => ({ accountIdentifier, ...originalProfile, name: profileName, accountCategory: categoryStatus === "approved" ? "agency" : "general", address: { ...originalProfile } });
  const category = () => ({ requestIdentifier: requestId, snapshotIdentifier: snapshotId, accountIdentifier, currentAccountCategory: "general", requestedAccountCategory: "agency", status: categoryStatus, requestedAt: savedAt });
  const change = () => ({ requestIdentifier: requestId, accountIdentifier, snapshotIdentifier: snapshotId, reviewedSnapshotIdentifier: changeStatus && changeStatus !== "pending" ? newSnapshotId : null, changeReason: "Changed contact information", status: changeStatus, requestedAt: savedAt, reviewedBy: null, reviewedAt: changeStatus !== "pending" ? savedAt : null, rejectionReason: changeStatus === "rejected" ? { code: "other", detail: "Check contact information" } : null });
  await page.route("**/api/account/**", async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method();
    if (path.endsWith("/snapshot-change-requests/latest")) return route.fulfill({ json: { request: changeStatus ? change() : null, changeRequiresApproval: categoryStatus === "approved" } });
    if (path.endsWith("/category-change-requests/latest")) return route.fulfill({ json: { request: categoryStatus ? category() : null } });
    if (path.endsWith("/snapshot")) {
      if (method === "PUT") { expect(route.request().postData()).toBeNull(); saved = true; return route.fulfill({ json: { snapshotIdentifier: snapshotId, accountIdentifier, status: "approved", savedAt } }); }
      return saved ? route.fulfill({ json: snapshot() }) : route.fulfill({ status: 404, json: { code: "account_snapshot_not_found" } });
    }
    if (path === `/api/account/accounts/${accountIdentifier}`) {
      if (method === "PUT") profileName = route.request().postDataJSON().accountName;
      return route.fulfill({ json: account() });
    }
    if (path === `/api/account/accounts/${accountIdentifier}/documents`) return route.fulfill({ json: { documents: [] } });
    if (path === `/api/account/accounts/${accountIdentifier}/category-change-requests`) { categoryStatus = "pending"; return route.fulfill({ json: category() }); }
    if (path.endsWith(`/account-category-change-requests/${requestId}/approve`)) { categoryStatus = "approved"; return route.fulfill({ json: category() }); }
    if (path.endsWith(`/account-category-change-requests/${requestId}`)) return route.fulfill({ json: { request: category(), account: { ...account(), name: originalProfile.name }, documents: [] } });
    if (path.endsWith("/account-category-change-requests")) return route.fulfill({ json: { requests: categoryStatus === "pending" ? [{ ...category(), accountName: originalProfile.name }] : [], pagination: { currentPage: 1, lastPage: 1, total: 1, perPage: 50 } } });
    if (path === `/api/account/accounts/${accountIdentifier}/snapshot-change-requests`) { expect(route.request().postDataJSON()).toEqual({ changeReason: "Changed contact information" }); changeStatus = "pending"; return route.fulfill({ json: change() }); }
    if (path.endsWith(`/account-snapshot-change-requests/${requestId}/approve`) || path.endsWith(`/account-snapshot-change-requests/${requestId}/reject`)) { changeStatus = path.endsWith("/approve") ? "approved" : "rejected"; return route.fulfill({ json: change() }); }
    if (path.endsWith(`/account-snapshot-change-requests/${requestId}`)) return route.fulfill({ json: { request: change(), original: { ...snapshot(), snapshotIdentifier: snapshotId, isCurrent: changeStatus !== "approved", account: originalProfile }, proposal: { account: { ...originalProfile, name: "Changed account" }, documents } } });
    if (path.endsWith("/account-snapshot-change-requests")) return route.fulfill({ json: { requests: changeStatus ? [change()] : [], pagination: { currentPage: 1, lastPage: 1, total: changeStatus ? 1 : 0, perPage: 50 } } });
    return route.fulfill({ status: 404, json: {} });
  });
}
for (const outcome of ["approve", "reject"] as const) test(`snapshot save → category approval → reasoned change → ${outcome} (schema fixtures)`, async ({ page }) => {
  if (outcome === "reject") await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/account/category-change");
  await expect(page.getByRole("button", { name: "申請する", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "書類アップロード", exact: true }).click();
  await page.getByRole("button", { name: "スナップショットを保存" }).click();
  await expect(page.getByText(snapshotId, { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "カテゴリ変更", exact: true }).click();
  await page.getByRole("button", { name: "申請する", exact: true }).click();
  await expect(page.getByRole("button", { name: "申請を取り下げる" })).toBeEnabled();
  await page.goto(`/admin/account/category-change-requests/${requestId}`);
  await page.getByRole("button", { name: "承認", exact: true }).click();
  await expect(page.getByRole("button", { name: "承認", exact: true })).toHaveCount(0);
  await page.goto("/admin/account/profile");
  await page.getByLabel("アカウント名", { exact: true }).fill("Changed account");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByLabel("変更理由", { exact: true }).fill("Changed contact information");
  await page.getByRole("button", { name: "変更を申請", exact: true }).click();
  await expect(page.getByLabel("アカウント名", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "スナップショットを保存" })).toBeDisabled();
  await page.getByRole("tab", { name: "スナップショット変更審査", exact: true }).click();
  await page.getByRole("link", { name: "詳細を確認" }).click();
  await expect(page.getByRole("region", { name: "変更前の情報" }).getByText("Original account", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "申請された情報" }).getByText("Changed account", { exact: true })).toBeVisible();
  const links = page.getByRole("region", { name: "変更前の情報" }).getByRole("link");
  await expect(links.first()).toHaveAttribute("href", /source=original$/);
  if (outcome === "reject") await page.getByLabel("拒否理由詳細").fill("Check contact information");
  await page.getByRole("button", { name: outcome === "approve" ? "承認" : "拒否", exact: true }).click();
  await expect(page.getByRole("button", { name: "承認", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "申請された情報" }).getByText("Changed account", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: `/private/tmp/issue-691-review-${outcome}.png`, fullPage: true });
  await page.goto("/admin/account/profile");
  await expect(page.getByLabel("アカウント名", { exact: true })).toBeEnabled();
  await expect(page.getByRole("region", { name: "現在有効な情報" }).getByText(outcome === "approve" ? "Changed account" : "Original account", { exact: true })).toBeVisible();
});
