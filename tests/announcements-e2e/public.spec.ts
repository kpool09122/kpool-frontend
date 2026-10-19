import { test, expect } from "../e2e/fixtures";
for (const [language, title, next] of [
  ["ja", "公開のお知らせ", "次へ"],
  ["en", "Published announcement", "Next"],
  ["ko", "게시된 공지사항", "다음"],
]) {
  test(`public ${language} list, pagination, detail and footer without login`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${language}/announcements`);
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: next, exact: true }).click();
    await expect(
      page.getByRole("link", { name: `${title} 2`, exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: `${title} 2`, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator("article")).toContainText(
      "<script>alert(1)</script>",
    );
    await expect(page.locator("article script")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const links = page.locator("footer nav a");
    await expect(links.nth(1)).toHaveAttribute("href", `/${language}/privacy`);
    await expect(links.nth(2)).toHaveAttribute(
      "href",
      `/${language}/announcements`,
    );
    await expect(links.nth(3)).toHaveAttribute("href", "/contact");
  });
}
test("switching header language refetches the matching published translation", async ({
  page,
}) => {
  await page.goto("/ja/announcements/019b0000-0000-7000-8000-000000000001");
  await page
    .getByRole("combobox", { name: "言語", exact: true })
    .selectOption("en");
  await expect(page).toHaveURL(/\/en\/announcements\//);
  await expect(
    page.getByRole("heading", { name: "Published announcement", exact: true }),
  ).toBeVisible();
});
test("missing and draft-only public detail returns not found", async ({
  page,
}) => {
  await page.goto("/ja/announcements/019b0000-0000-7000-8000-000000000099");
  await expect(
    page.getByRole("alert").filter({ hasText: "お知らせが見つかりません。" }),
  ).toContainText("お知らせが見つかりません。");
});
