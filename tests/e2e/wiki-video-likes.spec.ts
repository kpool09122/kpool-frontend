import { expect, test } from "./fixtures";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";
const id = "00000000-0000-4000-8000-000000000001";
const video = {
  videoLinkIdentifier: id,
  likeCount: 0,
  provider: "youtube", externalVideoId: "jfKfPfyJRdk", url: "https://youtu.be/jfKfPfyJRdk",
  title: "Video likes",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 120,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: null,
  videoUsage: "youtube_auto_recent_popular",
};
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
test("collaborator adds and removes with keyboard, does not refetch, restores saved state on reload", async ({
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
    route.fulfill({ json: wikiVideoAuthenticatedIdentity }),
  );
  let liked = false,
    reads = 0,
    personalReads = 0;
  const methods: string[] = [];
  await page.route("**/api/wiki/*/*/videos?*", (route) => {
    reads++;
    return route.fulfill({
      json: {
        videos: [
          { ...video, likeCount: Number(liked) },
          {
            ...video,
            videoLinkIdentifier: "00000000-0000-4000-8000-000000000002",
            title: "Manual video",
            videoUsage: "music_video",
            likeCount: 0,
          },
        ],
      },
    });
  });
  await page.route("**/api/wiki/videos/likes?*", (route) => {
    personalReads++;
    return route.fulfill({
      json: { likedVideoLinkIdentifiers: liked ? [id] : [] },
    });
  });
  await page.route(`**/api/wiki/videos/${id}/like`, (route) => {
    methods.push(route.request().method());
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf");
    liked = route.request().method() === "POST";
    return route.fulfill({ status: 204 });
  });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/wiki/ja/gr-video-create?tab=video");
  const add = page.getByRole("button", {
    name: "Like: Video likes",
    exact: true,
  });
  const remove = page.getByRole("button", {
    name: "Unlike: Video likes",
    exact: true,
  });
  await expect(add).toBeEnabled();
  await expect(add).toHaveText("0");
  const manual = page.getByRole("button", {
    name: "Like: Manual video",
    exact: true,
  });
  await expect(manual).toBeEnabled();
  await expect(manual).toHaveText("0");
  const initialReads = reads,
    initialPersonal = personalReads;
  await add.focus();
  await add.press("Enter");
  await expect(remove).toBeEnabled();
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await expect(remove).toHaveText("1");
  await remove.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("video-like-mobile.png") });
  expect(reads).toBe(initialReads);
  expect(personalReads).toBe(initialPersonal);
  await page.reload();
  await expect(remove).toBeEnabled();
  await expect(remove).toHaveText("1");
  const reloadReads = reads,
    reloadPersonal = personalReads;
  await remove.focus();
  await remove.press("Space");
  await expect(add).toBeEnabled();
  await expect(add).toHaveText("0");
  expect(reads).toBe(reloadReads);
  expect(personalReads).toBe(reloadPersonal);
  await page.reload();
  await expect(add).toBeEnabled();
  await expect(add).toHaveAttribute("aria-pressed", "false");
  expect(methods).toEqual(["POST", "DELETE"]);
});
test("guest sees login guidance after pressing like without sending personal reads or writes", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([{ name: "kpool-locale", value: "en", url: baseURL }]);
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({ status: 401 }),
  );
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({ json: { videos: [video] } }),
  );
  const personal: string[] = [];
  page.on("request", (request) => {
    if (/\/videos\/(likes\?|.*\/like$)/.test(request.url()))
      personal.push(request.url());
  });
  const auth = page.waitForResponse("**/api/identity/auth/me");
  await page.goto("/wiki/ja/gr-video-create?tab=video");
  await auth;
  const button = page.getByRole("button", {
    name: "Like: Video likes",
    exact: true,
  });
  await expect(button).toBeEnabled();
  await expect(button).toHaveText("0");
  await expect(page.getByText("To like videos, log in and activate Wiki collaborator access.")).toHaveCount(0);
  await button.focus();
  await button.press("Enter");
  await expect(button).toHaveAccessibleDescription("To like videos, log in and activate Wiki collaborator access.");
  await expect(page.getByRole("status").filter({ hasText: "To like videos, log in and activate Wiki collaborator access." })).toBeVisible();
  await page.getByRole("heading", { name: "Video likes", exact: true }).click();
  await expect(page.getByText("To like videos, log in and activate Wiki collaborator access.")).toHaveCount(0);
  await button.focus();
  await button.press("Enter");
  await expect(button).toHaveAccessibleDescription("To like videos, log in and activate Wiki collaborator access.");
  const filter = page.getByRole("slider", { name: "Minimum duration (minutes)" });
  await filter.focus();
  await expect(page.getByText("To like videos, log in and activate Wiki collaborator access.")).toHaveCount(0);
  await expect(filter).toBeFocused();
  expect(personal).toEqual([]);
});
