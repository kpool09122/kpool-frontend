import { expect, test } from "./fixtures";

for (const language of ["ja", "en", "ko"]) {
  test(`public metadata follows the ${language} route and cookie language`, async ({ page }) => {
    const origin = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
    await page.context().addCookies([{ name: "kpool-locale", value: language, url: origin }]);
    for (const path of [`/${language}`, `/${language}/wiki`, `/${language}/announcements`, "/login", "/signup", "/contact"]) {
      await page.goto(path);
      await expect(page).toHaveTitle(/k-pool/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
      await expect(page.locator('meta[name="description"]')).not.toHaveAttribute("content", /Brand color tokens/);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
    }
  });
}

test("wiki descriptions fall back to the wiki name on both public URL forms", async ({ page }) => {
  for (const language of ["ja", "en", "ko"]) {
    for (const path of [`/${language}/wiki/gr-aurora-echo`, `/wiki/${language}/gr-aurora-echo`]) {
      await page.goto(path);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Aurora Echo/);
    }
  }
});
