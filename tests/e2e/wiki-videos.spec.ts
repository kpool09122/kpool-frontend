import { expect, test } from "./fixtures";
const video = {
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
  url: "https://youtu.be/jfKfPfyJRdk",
  title: "Collected video",
  thumbnailUrl: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
  publishedAt: null,
  durationSeconds: 253,
  videoUsage: "youtube_auto_view_count",
};

test("anonymous mobile viewer loads videos only on selection, plays inline, and caches switches", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([
      {
        name: "kpool-locale",
        value: "en",
        url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
      },
    ]);
  await page.setViewportSize({ width: 390, height: 844 });
  let requests = 0;
  await page.route("**/api/wiki/*/*/videos?*", async (route) => {
    requests += 1;
    expect(route.request().url()).toContain(
      "/ja/gr-aurora-echo/videos?resourceType=group",
    );
    await route.fulfill({ json: { videos: [video] } });
  });
  await page.goto("/wiki/ja/gr-aurora-echo");
  const wiki = page.getByRole("tab", { name: "Wiki", exact: true });
  const videos = page.getByRole("tab", { name: "Video", exact: true });
  await expect(videos).toBeVisible();
  expect(requests).toBe(0);
  await wiki.focus();
  await wiki.press("ArrowRight");
  await expect(videos).toBeFocused();
  await expect(page.getByRole("img", { name: video.title })).toBeVisible();
  await page.getByRole("button", { name: `Play: ${video.title}` }).click();
  const player = page.locator('iframe[src*="youtube-nocookie.com"]');
  await expect(player).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk",
  );
  const box = await player.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  await expect(
    page.getByRole("link", { name: "Open on YouTube" }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=jfKfPfyJRdk");
  await wiki.click();
  await expect(player).toHaveCount(0);
  await videos.click();
  await expect(page.getByRole("img", { name: video.title })).toBeVisible();
  expect(requests).toBe(1);
});

test("editor disables Video and never requests videos, including keyboard and code-mode changes", async ({
  page,
}) => {
  const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url: baseURL },
    { name: "kpool-e2e-wiki-principal", value: "basic", url: baseURL },
    { name: "kpool-locale", value: "en", url: baseURL },
  ]);
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/videos")) requests += 1;
  });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
  const videoTab = page.getByRole("tab", { name: "Video" });
  await expect(videoTab).toBeDisabled();
  await videoTab.evaluate((button: HTMLButtonElement) => button.click());
  const wiki = page.getByRole("tab", { name: "Wiki", exact: true });
  await wiki.focus();
  await wiki.press("ArrowRight");
  await wiki.press("ArrowLeft");
  await expect(wiki).toBeFocused();
  await expect(wiki).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "code", exact: true }).click();
  await page.getByRole("button", { name: "gui", exact: true }).click();
  await expect(videoTab).toBeDisabled();
  expect(requests).toBe(0);
});

test("viewer filters video duration with keyboard range controls and reloads to clear", async ({ page }, testInfo) => {
  await page.context().clearCookies();
  await page.context().addCookies([{
    name: "kpool-locale", value: "en",
    url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
  }]);
  await page.setViewportSize({ width: 390, height: 844 });
  const queries: URLSearchParams[] = [];
  await page.route("**/api/wiki/*/*/videos?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    return route.fulfill({ json: { videos: query.has("minDurationSeconds") ? [] : [video] } });
  });
  await page.goto("/wiki/ja/gr-aurora-echo");
  await page.getByRole("tab", { name: "Video", exact: true }).click();
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  const minimum = page.getByRole("slider", { name: "Minimum duration (minutes)" });
  const maximum = page.getByRole("slider", { name: "Maximum duration (minutes)" });
  await minimum.focus();
  for (let i = 0; i < 10; i++) await minimum.press("ArrowRight");
  await maximum.focus();
  for (let i = 0; i < 20; i++) await maximum.press("ArrowLeft");
  await expect(minimum).toHaveValue("10");
  await expect(maximum).toHaveValue("20");
  expect(queries).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath("video-duration-filter.png") });
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect(page.getByText("No videos match this duration range.")).toBeVisible();
  expect(queries[1].get("minDurationSeconds")).toBe("600");
  expect(queries[1].get("maxDurationSeconds")).toBe("1200");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Video", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  await expect(minimum).toHaveValue("0");
  await expect(maximum).toHaveValue("40");
});

test("video tab has a shareable URL and follows browser history while preserving other URL parts", async ({ page }) => {
  await page.context().clearCookies();
  await page.context().addCookies([{
    name: "kpool-locale", value: "en",
    url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
  }]);
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({ json: { videos: [video] } }),
  );
  await page.goto("/wiki/ja/gr-aurora-echo?source=shared#videos");
  const wiki = page.getByRole("tab", { name: "Wiki", exact: true });
  const videos = page.getByRole("tab", { name: "Video", exact: true });
  await expect(wiki).toHaveAttribute("aria-selected", "true");
  await wiki.focus();
  await wiki.press("ArrowRight");
  await expect(videos).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\?source=shared&tab=video#videos$/);
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  await wiki.click();
  await expect(page).toHaveURL(/\?source=shared#videos$/);
  await page.goBack();
  await expect(videos).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(wiki).toHaveAttribute("aria-selected", "true");
  await page.goto("/wiki/ja/gr-aurora-echo?tab=video");
  await expect(videos).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  await page.reload();
  await expect(videos).toHaveAttribute("aria-selected", "true");
  await wiki.click();
  await expect(page).toHaveURL(/\/wiki\/ja\/gr-aurora-echo$/);
  await page.goto("/wiki/ja/gr-aurora-echo?tab=unknown");
  await expect(wiki).toHaveAttribute("aria-selected", "true");
});
