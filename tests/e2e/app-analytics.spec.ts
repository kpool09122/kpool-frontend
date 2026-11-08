import { test, expect, type Page } from "./fixtures";

const events = (page: Page) => page.evaluate(() => (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer?.filter((event) => typeof event.event === "string") ?? []);

test("language navigation flushes the source context before changing it and background/exit resume does not add views", async ({ page }) => {
  await page.goto("/ja/wiki/gr-twice?token=private-token#private-input");
  await expect.poll(async () => (await events(page)).filter((event) => event.event === "wiki_page_view").length).toBe(1);
  await page.getByRole("banner").getByRole("combobox").selectOption("ko");
  await expect(page).toHaveURL(/\/ko\/wiki\/gr-twice/);
  await expect.poll(async () => (await events(page)).filter((event) => event.event === "wiki_page_view").length).toBe(2);
  const queue = await events(page);
  const next = queue.findIndex((event) => event.event === "wiki_page_view" && event.wiki_language === "ko");
  const end = queue.findIndex((event) => event.event === "analytics_page_end" && event.wiki_language === "ja");
  expect(end).toBeGreaterThan(-1);
  expect(end).toBeLessThan(next);
  expect(queue[end]).toMatchObject({ page_location: expect.stringMatching(/\/ja\/wiki\/gr-twice$/) });
  expect(queue.slice(end + 1, next).some((event) => event.event === "analytics_context" && event.wiki_id === null)).toBe(true);
  expect(JSON.stringify(queue)).not.toContain("private-token");
  expect(JSON.stringify(queue)).not.toContain("private-input");

  const before = queue.filter((event) => event.event === "analytics_page_end" && event.wiki_language === "ko").length;
  // Browser lifecycle dispatch is deterministic; this does not claim an OS tab
  // background or real GA beacon has been observed.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
  });
  expect((await events(page)).filter((event) => event.event === "analytics_page_end" && event.wiki_language === "ko")).toHaveLength(before + 1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  expect((await events(page)).filter((event) => event.event === "wiki_page_view")).toHaveLength(2);
});

test("failed public content is App-only and a broken analytics queue never blocks navigation", async ({ page }) => {
  await page.goto("/wiki/ja/empty");
  await expect.poll(async () => (await events(page)).filter((event) => event.event === "analytics_context").length).toBeGreaterThan(0);
  expect((await events(page)).filter((event) => event.event === "wiki_page_view")).toHaveLength(0);
  expect((await events(page)).filter((event) => event.event === "analytics_context").every((event) => event.wiki_id === null)).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(window, "dataLayer", { configurable: true, get() { throw new Error("analytics blocked"); } });
  });
  await page.getByRole("banner").getByRole("link", { name: "k-pool", exact: true }).click();
  await expect(page).not.toHaveURL(/\/wiki\/ja\/empty/);
  await expect(page.getByRole("banner")).toBeVisible();
});
