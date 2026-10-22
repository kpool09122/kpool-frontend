import { expect, test } from "./fixtures";
const video = {
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
  url: "https://youtu.be/jfKfPfyJRdk",
  title: "Collected video",
  thumbnailUrl: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
  publishedAt: null,
  displayOrder: 1,
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
