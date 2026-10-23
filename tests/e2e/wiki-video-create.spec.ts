import { expect, test } from "./fixtures";

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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({ json: { videos: [] } }),
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
    requests.push(route.request().postDataJSON());
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf");
    await route.fulfill({ status: 204 });
  });
  await page.goto("/wiki/ja/gr-video-create");
  await page.getByRole("tab", { name: "Video", exact: true }).click();
  const form = page.getByRole("form", { name: "Add video" });
  await expect(form).toBeVisible();
  await form
    .getByLabel("YouTube URL")
    .fill(
      "https://www.youtube.com/watch?v=Os_heh8vPfs&list=RDokVTSehE414&index=27",
    );
  await form.getByLabel("Video title").fill("Manual music video");
  const save = form.getByRole("button", { name: "Save video" });
  await expect(save).toBeDisabled();
  await expect(page.getByTitle("YouTube preview")).toHaveAttribute(
    "data-video-id",
    "Os_heh8vPfs",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("test:duration")));
  await expect(save).toBeEnabled();
  await form.getByLabel("YouTube URL").fill("https://youtu.be/jfKfPfyJRdk");
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
    title: "Manual music video",
    videoUsage: "music_video",
    displayOrder: 0,
    durationSeconds: 124,
  });
  expect(requests[0]).not.toHaveProperty("principalIdentifier");
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
