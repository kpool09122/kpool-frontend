import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, runTestWithPage) => {
    // Exercise the local dataLayer boundary without contacting real analytics services.
    await page.context().route(/https:\/\/([^/]+\.)?(googletagmanager\.com|google-analytics\.com)\//, (route) => route.abort());
    // The API fixtures do not run Laravel; emulate its CSRF cookie bootstrap.
    await page.route("**/api/identity/auth/csrf-token", (route) => route.fulfill({
      status: 204,
      headers: { "Set-Cookie": "XSRF-TOKEN=e2e-csrf-token; Path=/; SameSite=Lax", "Cache-Control": "no-store" },
    }));
    await runTestWithPage(page);
  },
});
