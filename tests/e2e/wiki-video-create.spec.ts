import { expect, test } from "./fixtures";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";

test("collaborator previews one YouTube video, resets metadata on URL change, and saves one normalized record", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "kpool-locale",
      value: "en",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
    {
      name: "XSRF-TOKEN",
      value: "e2e-csrf",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
    {
      name: "kpool-mock-account-status",
      value: "active",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
    {
      name: "kpool-e2e-wiki-principal",
      value: "video-collaborator",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
  ]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: wikiVideoAuthenticatedIdentity }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://i.ytimg.com/vi/*/hqdefault.jpg", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  let savedVideo: Record<string, unknown> | null = null;
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({ json: { videos: savedVideo ? [savedVideo] : [] } }),
  );
  // Exercise the real preview lifecycle without depending on a YouTube connection.
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    window.YT = { Player: function(element, options) {
      const frame = document.createElement('iframe');
      frame.title = 'YouTube preview';
      frame.dataset.videoId = options.videoId;
      frame.style.width = '100%'; frame.style.height = '100%';
      element.replaceWith(frame);
      let seconds = 0;
      const listener = () => { seconds = 123.2; options.events.onStateChange(); };
      window.addEventListener('test:duration', listener);
      setTimeout(() => options.events.onReady(), 0);
      return { getDuration: () => seconds, destroy: () => { window.removeEventListener('test:duration', listener); frame.remove(); } };
    }};`,
    }),
  );
  const requests: unknown[] = [];
  await page.route("**/api/wiki/videos/create", async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    savedVideo = {
      provider: "youtube", externalVideoId: "Os_heh8vPfs",
      videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
      url: body.url,
      title: body.title,
      videoUsage: body.videoUsage,
      thumbnailUrl: body.thumbnailUrl,
      durationSeconds: body.durationSeconds,
      creatorPrincipalIdentifier: null,
      creatorIdentityName: null,
      likeCount: 0,
      publishedAt: null,
    };
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf");
    await route.fulfill({ status: 204 });
  });
  await page.goto("/wiki/ja/gr-video-create");
  await page.getByRole("tab", { name: "Video", exact: true }).click();
  const form = page.getByRole("form", { name: "Add video" });
  await expect(form).not.toBeVisible();
  await page.getByText("Add video", { exact: true }).press("Enter");
  await expect(form).toBeVisible();
  await expect(form.getByRole("spinbutton")).toHaveCount(0);
  await form.getByLabel("YouTube / TikTok URL").fill("https://www.tiktok.com.evil.test/@example/video/6718335390845095173");
  await expect(form.getByRole("alert")).toHaveText("Enter a valid YouTube / TikTok URL.");
  await expect(form.getByRole("button", { name: "Save video" })).toBeDisabled();
  expect(requests).toHaveLength(0);
  await form
    .getByLabel("YouTube / TikTok URL")
    .fill(
      "https://www.youtube.com/watch?v=Os_heh8vPfs&list=RDokVTSehE414&index=27",
    );
  await form.getByLabel("Video title").fill("Manual music video");
  await page.getByText("Add video", { exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.getByText("Add video", { exact: true }).click();
  await expect(form.getByLabel("Video title")).toHaveValue("Manual music video");
  const save = form.getByRole("button", { name: "Save video" });
  await expect(save).toBeDisabled();
  await expect(page.getByTitle("YouTube preview")).toHaveAttribute(
    "data-video-id",
    "Os_heh8vPfs",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("test:duration")));
  await expect(save).toBeEnabled();
  await form.getByLabel("YouTube / TikTok URL").fill("https://youtu.be/jfKfPfyJRdk");
  await expect(save).toBeDisabled();
  await expect(page.getByTitle("YouTube preview")).toHaveAttribute(
    "data-video-id",
    "jfKfPfyJRdk",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("test:duration")));
  await expect(save).toBeEnabled();
  await save.click();
  await expect(form.getByRole("status")).toContainText("Video saved");
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    resourceType: "group",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    thumbnailUrl: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    title: "Manual music video",
    videoUsage: "music_video",
    durationSeconds: 124,
  });
  expect(requests[0]).not.toHaveProperty("principalIdentifier");
  expect(requests[0]).not.toHaveProperty("displayOrder");
  await expect(page.getByText("2:04", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manual music video" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Manual music video" })).toHaveAttribute(
    "src",
    "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
  );
});

for (const url of ["https://www.tiktok.com/@scout2015/video/6718335390845095173", "https://vm.tiktok.com/AbCd123/", "https://vt.tiktok.com/AbCd123/"]) test(`TikTok registration retains inputs after metadata failure and shows saved server metadata: ${url}`, async ({ page }) => {
  const base = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
  await page.context().addCookies([
    { name: "kpool-locale", value: "en", url: base }, { name: "XSRF-TOKEN", value: "csrf", url: base },
    { name: "kpool-mock-account-status", value: "active", url: base }, { name: "kpool-e2e-wiki-principal", value: "video-collaborator", url: base },
  ]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: wikiVideoAuthenticatedIdentity }));
  let saved = false, attempts = 0;
  await page.route("https://images.k-pool.app/images/test.webp", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/wiki/*/*/videos?*", (route) => route.fulfill({ json: { videos: saved ? [{ provider: "tiktok", externalVideoId: "6718335390845095173", videoLinkIdentifier: "00000000-0000-4000-8000-000000000001", url, title: "TikTok saved", videoUsage: "short", thumbnailUrl: "https://images.k-pool.app/images/test.webp", durationSeconds: 15, creatorPrincipalIdentifier: null, creatorIdentityName: null, likeCount: 0, publishedAt: null }] : [] } }));
  await page.route("**/api/wiki/videos/create", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ url, durationSeconds: null, thumbnailUrl: null });
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 502, json: {} });
    saved = true; return route.fulfill({ status: 204 });
  });
  await page.goto("/wiki/ja/gr-video-create?tab=video");
  await page.getByText("Add video", { exact: true }).click();
  const form = page.getByRole("form", { name: "Add video" });
  await form.getByLabel("YouTube / TikTok URL").fill(url);
  await form.getByLabel("Video title").fill("TikTok saved");
  await expect(form.locator("iframe")).toHaveCount(0);
  await form.getByRole("button", { name: "Save video" }).click();
  await expect(form.getByRole("alert")).toContainText("Could not save");
  await expect(form.getByLabel("YouTube / TikTok URL")).toHaveValue(url);
  await form.getByRole("button", { name: "Save video" }).click();
  await expect(page.getByText("Video saved.", { exact: true })).toBeVisible();
  await expect(page.getByText("0:15", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "TikTok saved" })).toHaveAttribute("src", "https://images.k-pool.app/images/test.webp");
});

test("guest has public videos but no form or save button", async ({ page }) => {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "kpool-locale",
      value: "en",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
  ]);
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({ json: { videos: [] } }),
  );
  await page.goto("/wiki/ja/gr-video-create");
  await page.getByRole("tab", { name: "Video", exact: true }).click();
  await expect(page.getByText("No videos yet.")).toBeVisible();
  await expect(page.getByRole("form", { name: "Add video" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save video" })).toHaveCount(0);
});
