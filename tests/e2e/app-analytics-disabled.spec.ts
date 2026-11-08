import { test, expect } from "./fixtures";

test("analytics-disabled build preserves Wiki, language and non-Wiki navigation without loading GTM", async ({ page }) => {
  test.skip(process.env.E2E_ANALYTICS_ENABLED !== "false", "Run separately with E2E_ANALYTICS_ENABLED=false (a separate build-time configuration)");
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/ja/wiki/gr-twice");
  await expect(page.getByRole("heading", { name: "TWICE", exact: true })).toBeVisible();
  await page.getByRole("banner").getByRole("combobox").selectOption("ko");
  await expect(page).toHaveURL(/\/ko\/wiki\/gr-twice/);
  await page.getByRole("banner").getByRole("link", { name: "k-pool", exact: true }).click();
  await expect(page).toHaveURL(/\/ko$/);
  expect(await page.evaluate(() => (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [])).toEqual([]);
  expect(requests).toEqual([]);
  await expect(page.locator("#kpool-gtm")).toHaveCount(0);
});
