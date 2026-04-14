import { expect, test } from "@playwright/test";

test("home page shows the starter content", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/Get started by editing/i)).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Read our docs/i,
    }),
  ).toBeVisible();
});
