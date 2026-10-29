import { expect, test, type Page } from "./fixtures";
import { installYouTubePlayerMock } from "./youtube-player";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";
const id = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
const wikis = [
  {
    wikiIdentifier: id,
    language: "ja",
    slug: "tl-nayeon-twice",
    resourceType: "talent",
    name: "Nayeon",
  },
  {
    wikiIdentifier: secondId,
    language: "en",
    slug: "tl-second",
    resourceType: "talent",
    name: "Second",
  },
];
const video = {
  provider: "youtube",
  externalVideoId: "abcdefghijk",
  videoLinkIdentifier: id,
  url: "https://youtu.be/abcdefghijk",
  title: "Most requested",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 30,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: "Fan",
  likeCount: 1,
  hasOfficialOwnerLike: false,
  videoUsage: "short",
};
async function setup(page: Page) {
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "kpool-locale", value: "en", url: baseURL },
    { name: "XSRF-TOKEN", value: "inbox-csrf", url: baseURL },
    { name: "kpool-mock-account-status", value: "active", url: baseURL },
    {
      name: "kpool-e2e-wiki-principal",
      value: "video-collaborator",
      url: baseURL,
    },
  ]);
  // Match the mock gateway's server identity scope so AdminProvider can hydrate.
  const browserIdentity = {
    ...wikiVideoAuthenticatedIdentity,
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
    account: {
      ...wikiVideoAuthenticatedIdentity.account,
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      accountCategory: "general",
    },
  };
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({ json: browserIdentity }),
  );
  await page.route("**/api/wiki/videos/like-access?*", (route) =>
    route.fulfill({
      json: { canLike: true, canUnlike: true, principalIdentifier: id },
    }),
  );
  await page.route("**/api/wiki/videos/delete-access?*", (route) =>
    route.fulfill({ json: { canDelete: false, principalIdentifier: null } }),
  );
  await page.route("**/api/wiki/videos/watch-requests?*", (route) =>
    route.fulfill({
      json: {
        videoWatchRequests: [
          id,
          secondId,
          "00000000-0000-4000-8000-000000000003",
        ].map((videoLinkIdentifier) => ({
          videoLinkIdentifier,
          sent: false,
          canSend: false,
          reason: "target_not_eligible",
          lastSentAt: null,
          nextSendAt: null,
          remainingRequests: 3,
          unlikeRestrictedUntil: null,
          deleteRestrictedUntil: null,
        })),
      },
    }),
  );
  await installYouTubePlayerMock(page);
}
// Browser/BFF fixtures and external-player test double; not a live-backend write.
for (const width of [1280, 390])
  test(`owner inbox preserves ranked queue and applies ordinary likes at ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 844 });
    let liked = false,
      fail = false,
      writes = 0;
    const videos = () => [
      // Backend-ranked fixture: first two have equal request counts, ordered by likes;
      // the third has fewer requests, even though its ordinary like count is larger.
      { ...video, hasOfficialOwnerLike: liked },
      {
        ...video,
        title: "Equal requests, fewer likes",
        videoLinkIdentifier: "00000000-0000-4000-8000-000000000003",
        externalVideoId: "0123456789a",
        url: "https://youtu.be/0123456789a",
        likeCount: 0,
      },
      {
        ...video,
        title: "Fewer requests, more likes",
        videoLinkIdentifier: secondId,
        externalVideoId: "lmnopqrstuv",
        url: "https://youtu.be/lmnopqrstuv",
        likeCount: 99,
      },
    ];
    await page.route("**/api/wiki/my/watch-request-videos*", (route) =>
      route.fulfill({
        json: new URL(route.request().url()).searchParams.has("wikiIdentifier")
          ? { videos: videos() }
          : { wikis },
      }),
    );
    await page.route("**/api/wiki/*/*/videos?*", (route) =>
      route.fulfill({ json: { videos: videos() } }),
    );
    await page.route("**/api/wiki/videos/likes?*", (route) =>
      route.fulfill({ json: { likedVideoLinkIdentifiers: liked ? [id] : [] } }),
    );
    await page.route(`**/api/wiki/videos/${id}/like`, (route) => {
      expect(route.request().headers()["x-xsrf-token"]).toBe("inbox-csrf");
      expect(route.request().postData()).toBeNull();
      writes++;
      if (fail) return route.fulfill({ status: 500, json: {} });
      liked = route.request().method() === "POST";
      return route.fulfill({ status: 204 });
    });
    await page.goto(`/admin/wiki/watch-requests/${id}`);
    await expect(
      page.getByRole("heading", { name: "Most requested", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Official talent Wiki" }),
    ).toHaveValue(id);
    await expect(page.locator("li").getByRole("heading")).toHaveText([
      "Most requested",
      "Equal requests, fewer likes",
      "Fewer requests, more likes",
    ]);
    await page.getByRole("button", { name: "Play all", exact: true }).click();
    await expect(page.getByRole("region", { name: "Now playing", exact: true }).getByRole("button", { name: "Like: Most requested", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Continue in mini player" }).click();
    const playing = page.getByRole("region", {
      name: "Mini player",
      exact: true,
    });
    await expect(playing).toContainText("Most requested (1/3)");
    const like = playing.getByRole("button", {
      name: "Like: Most requested",
      exact: true,
    });
    await expect(like).toBeEnabled();
    await like.click();
    await expect(
      playing.getByRole("button", {
        name: "Unlike: Most requested",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      playing.getByRole("img", { name: "Liked by the official owner", exact: true }),
    ).toBeVisible();
    await expect(playing).toContainText("Most requested (1/3)");
    fail = true;
    await playing
      .getByRole("button", { name: "Unlike: Most requested", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Could not update the like" })
        .first(),
    ).toBeVisible();
    await expect(
      playing.getByRole("button", {
        name: "Unlike: Most requested",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(writes).toBe(2);
    await page.getByRole("button", { name: "Next video", exact: true }).click();
    await expect(playing).toContainText("Equal requests, fewer likes (2/3)");
    await page.getByRole("button", { name: "Next video", exact: true }).click();
    await expect(playing).toContainText("Fewer requests, more likes (3/3)");
    await page
      .getByRole("button", { name: "Previous video", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Previous video", exact: true })
      .click();
    await expect(playing).toContainText("Most requested (1/3)");
    await page
      .getByRole("combobox", { name: "Official talent Wiki" })
      .selectOption(secondId);
    await expect(page).toHaveURL(
      new RegExp(`/admin/wiki/watch-requests/${secondId}$`),
    );
    await expect(playing).toHaveCount(0);
    await page
      .getByRole("heading", { name: "Received watch requests" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`official-video-inbox-${width}.png`),
    });
  });
test("direct owner-management links preserve their destination through the login flow", async ({
  page,
}) => {
  await page.context().clearCookies();
  const destination = `/admin/wiki/watch-requests/${id}`;
  await page.goto(destination);
  await expect(page).toHaveURL(
    new RegExp(`/login\\?returnTo=${encodeURIComponent(destination)}$`),
  );
});
test("owner authorization errors never render private list items", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/wiki/my/watch-request-videos*", (route) =>
    route.fulfill({ status: 403, json: { message: "Unavailable" } }),
  );
  await page.goto(`/admin/wiki/watch-requests/${id}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "Owner access is unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Most requested", exact: true }),
  ).toHaveCount(0);
});
test("daily digest public video link exposes the exact owner-management destination", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/wiki/my/watch-request-videos", (route) =>
    route.fulfill({ json: { wikis } }),
  );
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({ json: { videos: [] } }),
  );
  await page.goto("/ja/wiki/tl-nayeon-twice?tab=video");
  await expect(
    page.getByRole("link", { name: "本人向けこれみて管理画面を開く" }),
  ).toHaveAttribute("href", `/admin/wiki/watch-requests/${id}`);
});
