import { expect, test } from "./fixtures";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";
const id = "00000000-0000-4000-8000-000000000001";
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
// Mock BFF contracts: browser evidence, not a live-backend send or real seven-day expiry test.
test("fresh mobile public Wiki session sends with CSRF, refreshes restrictions, combines filters and preserves backend order", async ({
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
  await page.route("**/api/wiki/videos/like-access?*", (route) =>
    route.fulfill({
      json: { canLike: true, canUnlike: true, principalIdentifier: id },
    }),
  );
  await page.route("**/api/wiki/videos/delete-access?*", (route) =>
    route.fulfill({ json: { canDelete: true, principalIdentifier: id } }),
  );
  const video = {
    provider: "youtube",
    externalVideoId: "abcdefghijk",
    videoLinkIdentifier: id,
    likeCount: 4,
    hasOfficialOwnerLike: true,
    url: "https://youtu.be/abcdefghijk",
    title: "Recommended short",
    thumbnailUrl: null,
    publishedAt: null,
    durationSeconds: 30,
    creatorPrincipalIdentifier: id,
    creatorIdentityName: "Fan",
    videoUsage: "short",
  };
  const other = {
    ...video,
    videoLinkIdentifier: "00000000-0000-4000-8000-000000000002",
    title: "More requests, fewer likes",
    likeCount: 1,
    hasOfficialOwnerLike: false,
  };
  let sent = false,
    writes = 0,
    personalReads = 0;
  const publicQueries: string[] = [];
  await page.route("**/api/wiki/*/*/videos?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    publicQueries.push(params.toString());
    return route.fulfill({
      json: {
        videos:
          params.get("sortByWatchRequests") === "true"
            ? [other, video]
            : [video, other],
      },
    });
  });
  await page.route("**/api/wiki/videos/likes?*", (route) =>
    route.fulfill({
      json: { likedVideoLinkIdentifiers: [id, other.videoLinkIdentifier] },
    }),
  );
  await page.route("**/api/wiki/videos/watch-requests?*", (route) => {
    personalReads++;
    return route.fulfill({
      json: {
        videoWatchRequests: [video, other].map((v) => ({
          videoLinkIdentifier: v.videoLinkIdentifier,
          sent: sent && v === video,
          canSend: !(sent && v === video),
          reason: sent && v === video ? "resend_not_available" : null,
          lastSentAt: sent ? "2026-10-29T00:00:00Z" : null,
          nextSendAt: sent ? "2026-11-05T00:00:00Z" : null,
          remainingRequests: sent ? 2 : 3,
          unlikeRestrictedUntil:
            sent && v === video ? "2026-11-05T00:00:00Z" : null,
          deleteRestrictedUntil:
            sent && v === video ? "2026-11-05T00:00:00Z" : null,
        })),
      },
    });
  });
  await page.route(`**/api/wiki/videos/${id}/watch-requests`, (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-xsrf-token"]).toBe("e2e-csrf");
    expect(route.request().postData()).toBeNull();
    writes++;
    sent = true;
    return route.fulfill({ status: 204 });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wiki/ja/tl-nayeon-twice?tab=video");
  const card = page
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", {
        name: "Recommended short",
        exact: true,
      }),
    });
  const send = card.getByRole("button", {
    name: "Send watch request",
    exact: true,
  });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    card.getByRole("button", { name: "Request sent", exact: true }),
  ).toBeEnabled();
  await expect(
    card.getByRole("button", {
      name: "Unlike: Recommended short",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    card.getByRole("button", {
      name: "Delete video: Recommended short",
      exact: true,
    }),
  ).toBeEnabled();
  const wikiTitle = await page.locator(".wiki-title > span").first().innerText();
  await expect(card.getByText(`Liked by ${wikiTitle}`, { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  expect(personalReads).toBeGreaterThan(1);
  await page.getByLabel(/^Match .+’s watch request list$/).check();
  await page
    .getByRole("slider", { name: "Maximum duration (minutes)" })
    .fill("1");
  await page.getByRole("button", { name: "Apply filter", exact: true }).click();
  await expect
    .poll(() => publicQueries.at(-1))
    .toContain(
      "maxDurationSeconds=60&recentWatchRequestsOnly=true&sortByWatchRequests=true",
    );
  const headings = page.getByRole("heading", {
    name: /^(More requests, fewer likes|Recommended short)$/,
  });
  await expect(headings).toHaveText([
    "More requests, fewer likes",
    "Recommended short",
  ]);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("watch-request-mobile.png"),
  });
});
