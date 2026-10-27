import { expect, test } from "./fixtures";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import { wikiVideoAuthenticatedIdentity as authenticatedIdentity } from "./wiki-video-identity";
const id = "00000000-0000-4000-8000-000000000001";
const video = {
  videoLinkIdentifier: id,
  provider: "youtube",
  externalVideoId: "jfKfPfyJRdk",
  url: "https://youtu.be/jfKfPfyJRdk",
  title:
    "A long video title for mobile deletion confirmation and playback layout",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 253,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: null,
  likeCount: 0,
  videoUsage: "youtube_auto_recent_popular",
} satisfies WikiVideo;
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;

test("mobile collaborator confirms by keyboard, preserves duration filters and handles failed deletion", async ({
  page,
}, testInfo) => {
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "kpool-locale", value: "en", url: baseURL },
    { name: "XSRF-TOKEN", value: "e2e-csrf", url: baseURL },
    { name: "kpool-mock-account-status", value: "active", url: baseURL },
    {
      name: "kpool-e2e-wiki-principal",
      value: "video-collaborator",
      url: baseURL,
    },
  ]);
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({ json: authenticatedIdentity }),
  );
  await page.setViewportSize({ width: 320, height: 700 });
  let deleted = false,
    attempts = 0;
  const queries: URLSearchParams[] = [];
  await page.route("**/api/wiki/*/*/videos?*", (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: { videos: deleted ? [] : [video] } });
  });
  await page.route(`**/api/wiki/videos/${id}`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf");
    attempts += 1;
    if (attempts === 1)
      return route.fulfill({ status: 403, json: { message: "forbidden" } });
    deleted = true;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/wiki/ja/gr-video-create?tab=video");
  const remove = page.getByRole("button", {
    name: `Delete video: ${video.title}`,
  });
  await expect(remove).toBeVisible();
  const heading = page.getByRole("heading", { name: video.title });
  const titleBox = await heading.boundingBox(),
    removeBox = await remove.boundingBox();
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(removeBox!.x);
  expect(removeBox!.width).toBeGreaterThanOrEqual(44);
  expect(removeBox!.height).toBeGreaterThanOrEqual(44);
  const playBox = await page
    .getByRole("button", { name: `Play: ${video.title}` })
    .boundingBox();
  expect(removeBox!.y + removeBox!.height).toBeLessThanOrEqual(playBox!.y);
  await remove.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("video-delete-card-mobile.png"),
  });
  await remove.focus();
  await remove.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete this video?" });
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeFocused();
  await cancel.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Delete", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(attempts).toBe(0);
  await remove.click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(attempts).toBe(0);
  const minimum = page.getByRole("slider", {
    name: "Minimum duration (minutes)",
  });
  await minimum.focus();
  await minimum.press("ArrowRight");
  await minimum.press("ArrowRight");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await remove.click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Could not delete the video",
  );
  await expect(heading).toBeVisible();
  await expect(minimum).toHaveValue("2");
  await page.screenshot({
    path: testInfo.outputPath("video-delete-mobile.png"),
  });
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("No videos match this duration range."),
  ).toBeVisible();
  await expect(minimum).toHaveValue("2");
  expect(attempts).toBe(2);
  expect(queries.at(-1)!.get("minDurationSeconds")).toBe("120");
  await minimum.focus();
  await minimum.press("Home");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect(page.getByText("No videos yet.")).toBeVisible();
});

test("guest and collaborator without delete permission keep public playback without deletion", async ({
  page,
}) => {
  for (const mode of [null, "basic"]) {
    await page.context().clearCookies();
    await page.context().addCookies([
      { name: "kpool-locale", value: "en", url: baseURL },
      ...(mode
        ? [
            {
              name: "kpool-mock-account-status",
              value: "active",
              url: baseURL,
            },
            { name: "kpool-e2e-wiki-principal", value: mode, url: baseURL },
          ]
        : []),
    ]);
    await page.route("**/api/wiki/*/*/videos?*", (route) =>
      route.fulfill({ json: { videos: [video] } }),
    );
    await page.route("**/api/identity/auth/me", (route) =>
      mode
        ? route.fulfill({ json: authenticatedIdentity })
        : route.fulfill({ status: 401 }),
    );
    const authResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/identity/auth/me",
    );
    const accessResponse = mode
      ? page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname ===
            "/api/wiki/videos/delete-access",
        )
      : null;
    await page.goto("/wiki/ja/gr-video-create?tab=video");
    await authResponse;
    if (accessResponse)
      expect(await (await accessResponse).json()).toEqual({
        canDelete: false,
        principalIdentifier: null,
      });
    await expect(
      page.getByRole("button", { name: `Play: ${video.title}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Delete video: ${video.title}` }),
    ).toHaveCount(0);
  }
});
