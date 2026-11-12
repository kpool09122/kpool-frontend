import { test, expect, type Page } from "./fixtures";

const wikiEvents = (page: Page) => page.evaluate(() => {
  const queue = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer ?? [];
  return queue.filter((event) => event.event === "wiki_page_view" || event.event === "wiki_link_click");
});

test("public Wiki views survive client navigation and exclude editing while GTM is blocked", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const url = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url },
    { name: "kpool-locale", value: "en", url },
    { name: "kpool-e2e-wiki-principal", value: "basic", url },
  ]);
  await page.goto("/ja/wiki/gr-twice?utm_source=analytics-e2e");
  await expect.poll(async () => (await wikiEvents(page)).filter((event) => event.event === "wiki_page_view").length).toBe(1);
  expect((await wikiEvents(page))[0]).toMatchObject({
    wiki_id: "gr-twice", wiki_translation_set_id: "translation-set-gr-twice",
    wiki_language: "ja", wiki_type: "group",
  });
  expect((await wikiEvents(page))[0].page_location).not.toContain("?");

  // Opening content rerenders the page but is not another view.
  await page.getByTestId("section-toggle-sec-twice-overview").click();
  await expect(page.getByTestId("section-sec-twice-overview")).toHaveAttribute("open", "");
  expect((await wikiEvents(page)).filter((event) => event.event === "wiki_page_view")).toHaveLength(1);

  await page.getByRole("link", { name: "セクションを編集: Overview" }).click();
  await expect(page).toHaveURL(/\/wiki\/gr-twice\/edit\?resourceType=group$/);
  await expect.poll(() => page.evaluate(() => (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer?.filter((event) => event.event === "app_page_view").length ?? 0)).toBe(1);
  const boundary = await page.evaluate(() => (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer ?? []);
  const end = boundary.findIndex((event) => event.event === "analytics_page_end" && event.wiki_id === "gr-twice");
  const editor = boundary.findIndex((event) => event.event === "app_page_view");
  expect(end).toBeGreaterThan(-1);
  expect(editor).toBeGreaterThan(end);
  expect(boundary[editor]).toMatchObject({ wiki_id: null, wiki_translation_set_id: null, wiki_language: null, page_title: "k-pool" });
  expect((await wikiEvents(page)).filter((event) => event.event === "wiki_page_view")).toHaveLength(1);
  await page.goBack();
  await expect.poll(async () => (await wikiEvents(page)).filter((event) => event.event === "wiki_page_view").length).toBe(2);
  await page.goForward();
  await expect(page).toHaveURL(/\/edit\?resourceType=group$/);
  await page.goBack();
  await expect.poll(async () => (await wikiEvents(page)).filter((event) => event.event === "wiki_page_view").length).toBe(3);
});

test("a body Wiki link records the source and preserves its new-tab behavior", async ({ page, context }) => {
  await page.goto("/ja/wiki/gr-twice");
  await expect.poll(async () => (await wikiEvents(page)).length).toBe(1);
  const link = page.locator('a[data-wiki-link-placement="body"]').first();
  const path = new URL((await link.getAttribute("href"))!, page.url()).pathname;
  await expect(link).toHaveAttribute("target", "_blank");
  const opened = context.waitForEvent("page");
  await link.click();
  const destination = await opened;
  await expect.poll(async () => (await wikiEvents(page)).length).toBe(2);
  expect((await wikiEvents(page))[1]).toMatchObject({
    event: "wiki_link_click", wiki_id: "gr-twice", wiki_type: "group",
    link_placement: "body", link_path: path, target_wiki_id: null,
  });
  expect(page.url()).toMatch(/\/ja\/wiki\/gr-twice$/);
  await destination.close();
});
