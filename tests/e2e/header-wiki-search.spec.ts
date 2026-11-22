import { expect, test } from "./fixtures";

for (const width of [390, 640, 1280]) {
  test(`header search offers Wiki navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const queries: URLSearchParams[] = [];
    await page.route("**/api/wiki/public-wikis?**", (route) => {
      queries.push(new URL(route.request().url()).searchParams);
      return route.fulfill({ json: {
        status: "success",
        data: { wikis: [{ wikiIdentifier: "1", name: "TWICE", slug: "gr-twice", language: "ja" }] },
      } });
    });
    await page.goto("/ja");
    const input = page.getByRole("combobox", { name: "Wikiを検索" });
    const openSearch = page.getByRole("button", { name: "Wikiを検索", exact: true });
    await expect(input).toHaveCount(0);
    await openSearch.click();
    await expect(input).toBeVisible();
    await expect(page.getByRole("button", { name: "ナビゲーションメニュー" })).toHaveCount(0);
    await page.getByRole("button", { name: "検索を閉じる" }).click();
    await expect(input).toHaveCount(0);
    await openSearch.click();
    await input.fill("TWICE");
    const option = page.getByRole("option", { name: "TWICE" });
    await expect(option).toBeVisible();
    expect(queries).toHaveLength(1);
    expect(queries[0].get("language")).toBe("ja");
    expect(queries[0].get("keyword")).toBe("TWICE");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 1280) {
      await input.press("ArrowDown");
      await expect(option).toHaveAttribute("aria-selected", "true");
      await input.press("Enter");
    } else {
      await option.click();
    }
    await expect(page).toHaveURL(/\/ja\/wiki\/gr-twice$/);
    await expect(page.getByRole("listbox", { name: "検索候補" })).toHaveCount(0);
  });
}
