import { expect, test, type Page } from "@playwright/test";

const useJapaneseLocale = async (page: Page) => {
  await page.context().addCookies([
    {
      name: "kpool-locale",
      value: "ja",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
};

test("mypage shows the Wiki collaborator activation path", async ({ page }) => {
  await useJapaneseLocale(page);
  await page.route("**/api/wiki/principal/me", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Wiki principal was not found." }),
    });
  });

  await page.goto("/mypage");

  await expect(page.getByRole("heading", { name: "マイページ" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "マイページメニュー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "概要" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("button", { name: "Wiki", exact: true }).click();

  await expect(
    page.getByRole("button", { name: "Wiki", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Wiki collaborator を有効化" }),
  ).toBeVisible();
  await expect(
    page.getByText("この機能を有効にするには Wiki のコラボレータになる必要があります。"),
  ).toBeVisible();
});
