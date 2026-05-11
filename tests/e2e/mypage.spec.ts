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

  await expect(page.getByRole("heading", { name: "Wiki", level: 1 })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "マイページメニュー" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "マイページメニューを閉じる" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "マイページメニューを閉じる" }).click();
  await expect(
    page.getByRole("button", { name: "マイページメニューを開く" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "マイページメニューを開く" }).click();
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

test("mypage shows under review draft images for an available Wiki principal", async ({ page }) => {
  await useJapaneseLocale(page);
  const draftImageRequests: string[] = [];

  await page.route("**/api/wiki/principal/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        principalIdentifier: "33333333-3333-3333-3333-333333333333",
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        isDelegatedPrincipal: false,
        isEnabled: true,
      }),
    });
  });
  await page.route("**/api/wiki/draft-images?**", async (route) => {
    draftImageRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        images: [
          {
            imageIdentifier: "44444444-4444-4444-4444-444444444444",
            publishedImageIdentifier: null,
            url: "https://images.example.test/review.png",
            resourceType: "group",
            wikiIdentifier: "55555555-5555-5555-5555-555555555555",
            imageUsage: "wiki_editor",
            displayOrder: 1,
            sourceUrl: "",
            sourceName: "review.png",
            altText: "Review image",
            status: "under_review",
            uploadedAt: "2026-05-09T00:00:00Z",
          },
        ],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    });
  });

  await page.goto("/mypage");

  await expect(page.getByRole("heading", { name: "Wiki", level: 1 })).toBeVisible();
  await expect(page.getByRole("tab", { name: "未承認の画像" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Review image")).toBeVisible();
  await expect(page.getByText("under_review")).toBeVisible();
  expect(draftImageRequests[0]).toContain("status=under_review");
  expect(draftImageRequests[0]).not.toContain("pending");
});
