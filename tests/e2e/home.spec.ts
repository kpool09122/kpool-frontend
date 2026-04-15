import { expect, test } from "@playwright/test";

test("home page shows the theme preview content", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Trust-forward colors for a calm, premium first impression/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Theme token preview/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("--brand-primary")).toBeVisible();
  await expect(page.getByText("Deep Harbor")).toBeVisible();

  await expect(page.getByTestId("theme-mode-label")).toHaveText(/light|dark/i);
  await page.getByRole("button", { name: /toggle color theme/i }).click();
  await expect(page.getByTestId("theme-mode-label")).toHaveText("Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
