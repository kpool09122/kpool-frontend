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
  await expect(
    page.getByRole("link", { name: /Open Wiki Detail Demo/i }),
  ).toBeVisible();

  await expect(page.getByTestId("theme-mode-label")).toHaveText(/light|dark/i);
  await page.getByRole("button", { name: /toggle color theme/i }).click();
  await expect(page.getByTestId("theme-mode-label")).toHaveText("Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("link", { name: /Open Wiki Detail Demo/i }).click();
  await expect(
    page.getByRole("heading", { name: /Aurora Echo/i }),
  ).toBeVisible();
});

test("home page demo links open the wiki detail page with a theme color override", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByTestId("wiki-theme-demo-rose-stage").click();

  await expect(page).toHaveURL(/themeColor=%23d94f70/);
  await expect(page.getByTestId("wiki-theme-badge")).toHaveText("Theme #D94F70");
  await expect(page.getByTestId("wiki-theme-root")).toHaveAttribute(
    "style",
    /--wiki-page-background-light:/,
  );
});

test("mobile header menu shows the login link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "K-Pool" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ログイン" })).toBeHidden();

  const menuButton = page.getByRole("button", {
    name: "ナビゲーションメニュー",
  });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await expect(async () => {
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true", {
      timeout: 1000,
    });
  }).toPass();
  await expect(
    page.getByRole("navigation", { name: "モバイルメニュー" }).getByRole("link", {
      name: "ログイン",
    }),
  ).toBeVisible();
});
